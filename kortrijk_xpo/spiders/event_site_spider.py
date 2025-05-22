import scrapy
from urllib.parse import urlparse, urlunparse
import re # Import re
import subprocess # Added for running clean_json.py
from pathlib import Path # Added for path manipulation
from scrapy import signals # Added for spider_closed signal
import time

class EventSiteSpider(scrapy.Spider):
    """Generic spider for crawling an entire single external event website,
    strictly staying on the start_url's domain (unlimited depth by default).

    Usage example (unlimited depth is default):
        scrapy crawl event_site_spider -a start_url=https://www.flandersflooringdays.com -a event_id=ffd
    """

    name = "event_site_spider"
    allowed_domains: list[str] = []  # allow everything – we restrict manually

    # Per-instance custom settings are tweaked in __init__ (feed URI & depth)
    custom_settings = {
        "FEED_FORMAT": "json",
        "FEED_EXPORT_ENCODING": "utf-8",
        "DEPTH_LIMIT": 0,
        "LOG_LEVEL": "INFO",
        "USER_AGENT": "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
        "ROBOTSTXT_OBEY": False,
    }

    def __init__(self, start_url: str | None = None, event_id: str = "event", depth: int = 0, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not start_url:
            raise ValueError("You must provide -a start_url=<URL> when launching event_site_spider.")

        # Prepare runtime settings
        self.start_urls = [start_url]
        self.event_id = event_id.lower()

        # Set allowed_domains dynamically based on the start_url.
        # Scrapy's OffsiteMiddleware will use this to ensure the spider stays on the initial domain.
        parsed_start_url = urlparse(start_url)
        self.allowed_domains = [parsed_start_url.netloc]

        # NOTE: Use -O <filename.json> on the scrapy command line for custom output
        # Depth can still be overridden at runtime via '-s DEPTH_LIMIT=...' in the command.

        self._visited: set[str] = set()

    # ---------------------------------------------------------------------
    # Core parsing logic (very similar to full_site_spider but simplified)
    # ---------------------------------------------------------------------
    def parse(self, response: scrapy.http.Response):
        url = response.url
        if url.lower().endswith(".pdf"):
            self.logger.info(f"Skipping PDF file: {url}")
            return
        if url in self._visited:
            return
        self._visited.add(url)
        self.logger.info(f"Processing: {url}")

        # Extract basic page data
        title = response.css("title::text").get(default="").strip()
        description = (
            response.css("meta[name='description']::attr(content)").get(default="").strip() or
            response.css("meta[property='og:description']::attr(content)").get(default="").strip()
        )
        text_nodes = response.xpath("//body//text()[not(ancestor::script) and not(ancestor::style)]").getall()
        raw_text = " ".join(text_nodes).strip()

        # ------------------------------------------------------------------
        # Attempt to extract booth / stand number from the raw text
        # The website uses "Booth: 142" in EN. Other languages might use
        # "Stand: 142" (NL/FR/DE). We therefore look for either keyword
        # (case–insensitive) followed by an optional colon and the number.
        # We only capture the first occurrence if multiple are present.
        # ------------------------------------------------------------------
        booth_number: str | None = None
        booth_regex = re.compile(r"\b(?:Booth|Stand)\s*[:#]??\s*(\d{1,4})", re.IGNORECASE)
        booth_match = booth_regex.search(raw_text)
        if booth_match:
            booth_number = booth_match.group(1)

        yield {
            "event_id": self.event_id,
            "url": url,
            "title": title,
            "description": description,
            "raw_text_content": raw_text,
            "source_type": "event_site",
            "booth_number": booth_number,
        }

        # Collect all potential internal links first
        potential_links_to_follow = []
        for href in response.css("a[href]::attr(href)").getall():
            full_url = response.urljoin(href)
            parsed_url = urlparse(full_url)
            
            # Skip PDF files
            if parsed_url.path.lower().endswith(".pdf"):
                self.logger.debug(f"Skipping PDF link: {full_url}")
                continue
            
            # Ensure it's http/https, stays on the same domain, and not yet visited
            if (parsed_url.scheme in {"http", "https"} and
                parsed_url.netloc == self.allowed_domains[0] and # Check against the spider's allowed domain
                full_url not in self._visited):
                potential_links_to_follow.append(full_url)
        
        # Filter and prioritize these links based on language
        # Deduplicate potential_links_to_follow before filtering
        unique_potential_links = sorted(list(set(potential_links_to_follow)))
        
        actually_follow_links = self._filter_and_prioritize_links(unique_potential_links)

        for link_to_visit in actually_follow_links:
            if link_to_visit not in self._visited: # Double check, though _filter should handle visited
                 self.logger.debug(f"Yielding request for: {link_to_visit} from {url}")
                 yield scrapy.Request(link_to_visit, callback=self.parse)
            else:
                 self.logger.debug(f"Skipping already visited link (post-filter): {link_to_visit}")

    def _normalize_path_for_grouping(self, path: str) -> str:
        # Try to remove known language prefixes /en/, /nl/, /fr/ for grouping
        # This helps group domain.com/en/page and domain.com/nl/page as the same conceptual "page"
        # Assumes language codes are single segments like /en/ or /fr-be/
        # More complex language code patterns might need a more robust regex
        lang_codes = ['en', 'nl', 'fr', 'de'] # Add more if needed
        path_segments = path.strip('/').split('/')
        
        # Check if the first segment is a language code (e.g. /en/foo or /fr-BE/foo)
        if path_segments and path_segments[0].lower() in lang_codes:
            # Check if it's a simple lang code (e.g. 'en') or locale specific (e.g. 'en-gb')
            # For simplicity, we assume if it matches a base lang_code, it's a language marker.
            return '/' + '/'.join(path_segments[1:])
        
        # Check for language codes like /nl-be/ or /fr_FR/ (heuristic)
        if path_segments and (re.match(r'^[a-z]{2}[-_][a-zA-Z]{2}$', path_segments[0]) or path_segments[0].lower() in lang_codes):
             # Check if the first part before - or _ is a known language code
             if path_segments[0].split_string_part[0].lower() in lang_codes:
                return '/' + '/'.join(path_segments[1:])


        return path # Return original path if no identifiable language prefix

    def _get_path_language(self, path: str) -> str | None:
        # Extracts language code if path starts with /<lang_code>/
        # Example: /en/some/page -> en
        # Example: /fr-be/some/page -> fr-be
        # Example: /products/item -> None
        path_segments = path.strip('/').split('/')
        if not path_segments:
            return None
        
        first_segment = path_segments[0].lower()
        # Simple 2-letter lang codes + common variants
        known_lang_prefixes = ['en', 'nl', 'fr', 'de'] # Could be expanded
        # Matches 'en', 'en-us', 'en_US', 'fr-be', etc.
        lang_pattern = r'^([a-z]{2})([-_][a-zA-Z]{2})?$' 
        
        match = re.match(lang_pattern, first_segment)
        if match and match.group(1) in known_lang_prefixes:
            return first_segment # Return the full matched segment e.g. 'en' or 'en-us'
        
        return None


    def _filter_and_prioritize_links(self, links: list[str]) -> list[str]:
        if not links:
            return []

        self.logger.debug(f"Filtering {len(links)} potential links: {links}")
        
        grouped_by_base_path = {} # Key: base_path, Value: {'en': url, 'default': url, 'others': {lang: url}}

        for url_str in links:
            if url_str in self._visited: # Skip already visited URLs early
                self.logger.debug(f"Link {url_str} already visited, skipping in filter.")
                continue

            parsed_url = urlparse(url_str)
            path = parsed_url.path
            
            lang_in_path = self._get_path_language(path)
            
            # Use path without leading lang for grouping, but INCLUDE the query string
            # so that participant detail pages like /participant/?id=123 remain distinct.
            base_path_key = path # Default base_path (will update below)
            query_part = ('?' + parsed_url.query) if parsed_url.query else ''

            if lang_in_path:
                # Remove the lang segment to get a base path for grouping
                # e.g., /en/foo/bar -> /foo/bar
                # e.g., /en-us/baz -> /baz
                path_segments = path.strip('/').split('/')
                # Reconstruct path without the first segment (lang code)
                # Add leading slash if there are remaining segments
                # If only lang code (e.g. /en/), base path becomes '/'
                base_path_key = ('/' + '/'.join(path_segments[1:]) if len(path_segments) > 1 else '/') + query_part
            else:
                base_path_key = path + query_part

            if base_path_key not in grouped_by_base_path:
                grouped_by_base_path[base_path_key] = {'en': None, 'default': None, 'others': {}}
            
            entry = grouped_by_base_path[base_path_key]

            if lang_in_path:
                # Normalize 'en-us', 'en-gb' to 'en' for primary keying, but store original lang_in_path
                primary_lang_key = lang_in_path.split('-')[0].split('_')[0] # en-us -> en
                if primary_lang_key == 'en':
                    # Prefer shorter 'en' if multiple 'en-*' exist, or first one encountered
                    if not entry['en'] or (lang_in_path == 'en' and entry['en'] != url_str):
                         entry['en'] = url_str 
                    elif not entry['en']: # first en-* variant
                        entry['en'] = url_str
                else: # nl, fr, de etc.
                    if lang_in_path not in entry['others']: # Store first one for this specific lang
                        entry['others'][lang_in_path] = url_str
            else: # No language code detected in path, assume default
                if not entry['default']: # Store first default encountered
                    entry['default'] = url_str
        
        final_links_to_follow = []
        for base_path, urls in grouped_by_base_path.items():
            chosen_url = None
            if urls['en']:
                chosen_url = urls['en']
                self.logger.debug(f"Base path '{base_path}': Chose EN version: {chosen_url}")
            elif urls['default']:
                chosen_url = urls['default']
                self.logger.debug(f"Base path '{base_path}': No EN, chose DEFAULT version: {chosen_url}")
            else:
                # No 'en' or 'default'. User wants to skip other languages.
                if urls['others']:
                    self.logger.debug(f"Base path '{base_path}': No EN or DEFAULT. Skipping other languages: {urls['others']}")
                else:
                    self.logger.debug(f"Base path '{base_path}': No suitable versions found after filtering (no en, default, or others).")

            if chosen_url and chosen_url not in self._visited:
                final_links_to_follow.append(chosen_url)
            elif chosen_url and chosen_url in self._visited:
                 self.logger.debug(f"Base path '{base_path}': Chosen URL {chosen_url} was already visited, not adding again.")
        
        if len(links) != len(final_links_to_follow):
            self.logger.info(f"Language filtering: reduced {len(links)} potential links to {len(final_links_to_follow)} selected links.")
        else:
            self.logger.debug(f"Language filtering: no change in link count ({len(links)}).")
            
        return final_links_to_follow 

    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super(EventSiteSpider, cls).from_crawler(crawler, *args, **kwargs)
        crawler.signals.connect(spider.spider_closed, signal=signals.spider_closed)
        return spider

    def spider_closed(self, spider, reason):
        spider.logger.info(f"Spider closed: {spider.name}, reason: {reason}")

        feeds = self.settings.get('FEEDS')
        if not feeds:
            spider.logger.warning("No FEEDS setting found. Cannot determine output file for cleaning.")
            return

        # FEEDS is a dictionary where keys are URIs (file paths) and values are dicts with format, etc.
        # We'll take the first one, assuming one output file.
        # If -O is used, FEEDS will look like: {'output.json': {'format': 'json', ...}}
        # If FEEDS setting is used, it might be like: {'file:///path/to/output.json': {'format': 'json', ...}}
        
        output_uri = list(feeds.keys())[0]
        
        # Convert URI to path
        if output_uri.startswith('file://'):
            output_file_path = Path(urlparse(output_uri).path)
        else:
            # Assume it's a relative or absolute path if no scheme (e.g. from -O option)
            output_file_path = Path(output_uri)

        # Add a small delay to ensure file is written
        max_retries = 5
        retry_delay = 1  # seconds
        
        for attempt in range(max_retries):
            if output_file_path.exists() and output_file_path.stat().st_size > 0:
                break
            spider.logger.info(f"Waiting for output file to be written (attempt {attempt + 1}/{max_retries})...")
            time.sleep(retry_delay)

        if not output_file_path.exists():
            spider.logger.error(f"Output file {output_file_path} not found after {max_retries} attempts. Cannot clean.")
            return

        if output_file_path.stat().st_size == 0:
            spider.logger.error(f"Output file {output_file_path} exists but is empty. Cannot clean.")
            return

        clean_script_path = Path(__file__).resolve().parent.parent.parent / "clean_json.py" # Assumes clean_json.py is in the project root

        if not clean_script_path.exists():
            spider.logger.error(f"clean_json.py script not found at {clean_script_path}. Cannot clean the output.")
            return
            
        # Command to clean the JSON file in place, with indentation, collapse whitespace, and remove non-ASCII
        cmd = [
            "python",
            str(clean_script_path),
            str(output_file_path),
            "-o",
            str(output_file_path.with_suffix('.clean.json')), # Output to a separate clean file
            "-i", # Indent
            "-c", # Collapse values
            "--remove-non-ascii" # Remove non-ASCII
        ]

        try:
            spider.logger.info(f"Running clean_json.py on {output_file_path}...")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            spider.logger.info(f"""clean_json.py output:
{result.stdout}""")
            if result.stderr:
                 spider.logger.warning(f"""clean_json.py errors/warnings:
{result.stderr}""")
            spider.logger.info(f"Successfully cleaned {output_file_path}.")
        except subprocess.CalledProcessError as e:
            spider.logger.error(f"Error running clean_json.py on {output_file_path}:")
            spider.logger.error(f"Command: {' '.join(e.cmd)}")
            spider.logger.error(f"Return code: {e.returncode}")
            spider.logger.error(f"Stdout: {e.stdout}")
            spider.logger.error(f"Stderr: {e.stderr}")
        except FileNotFoundError:
            spider.logger.error(f"Error: clean_json.py script not found at {clean_script_path} or python interpreter not found.") 