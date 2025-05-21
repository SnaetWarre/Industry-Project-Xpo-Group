import scrapy
from urllib.parse import urlparse

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
        "FEED_URI": "event_site_data.json",  # placeholder – overridden in __init__
        "FEED_EXPORT_ENCODING": "utf-8",
        "DEPTH_LIMIT": 1,  # overridden in __init__ if needed
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

        # Feed file name e.g. 'ffd_site_data.json'
        self.custom_settings["FEED_URI"] = f"{self.event_id}_site_data.json"
        self.custom_settings["DEPTH_LIMIT"] = int(depth)

        self._visited: set[str] = set()

    # ---------------------------------------------------------------------
    # Core parsing logic (very similar to full_site_spider but simplified)
    # ---------------------------------------------------------------------
    def parse(self, response: scrapy.http.Response):
        url = response.url
        if url in self._visited:
            return
        self._visited.add(url)

        # Extract basic page data
        title = response.css("title::text").get(default="").strip()
        description = (
            response.css("meta[name='description']::attr(content)").get(default="").strip() or
            response.css("meta[property='og:description']::attr(content)").get(default="").strip()
        )
        text_nodes = response.xpath("//body//text()[not(ancestor::script) and not(ancestor::style)]").getall()
        raw_text = " ".join(text_nodes).strip()

        yield {
            "event_id": self.event_id,
            "url": url,
            "title": title,
            "description": description,
            "raw_text_content": raw_text,
            "source_type": "event_site",
        }

        # Follow internal links. OffsiteMiddleware (active by default)
        # will use self.allowed_domains (set in __init__) to filter out external domains.
        for href in response.css("a[href]::attr(href)").getall():
            full_url = response.urljoin(href)
            parsed = urlparse(full_url)
            # Only follow http/https links and ensure it's not already visited.
            if parsed.scheme in {"http", "https"} and full_url not in self._visited:
                yield scrapy.Request(full_url, callback=self.parse) 