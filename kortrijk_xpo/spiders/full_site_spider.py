import scrapy
from urllib.parse import urlparse

# Domains or suffixes to skip
BLACKLISTED_DOMAINS = [
    '.eu', 'facebook.com', 'instagram.com', 'twitter.com',
    'linkedin.com', 'youtube.com', 'ec.europa.eu', 'europa.eu', 'apps.apple.com', 'play.google.com',
    'kb.mozillazine.org', 'mozillazine.org', 'mozillazine.net', 'mozillazine.nl', 'mozillazine.be',
    'support.mozilla.org', 'support.microsoft.com', 'support.apple.com', 'support.google.com',
]

class FullSiteSpider(scrapy.Spider):
    name = 'full_site_spider'
    allowed_domains = []  # disable offsite filtering
    start_urls = ['https://www.kortrijkxpo.com/kalender/']

    custom_settings = {
        'FEED_FORMAT': 'json',
        'FEED_URI': 'full_site_data.json',
        'FEED_EXPORT_ENCODING': 'utf-8',
        'DEPTH_LIMIT': 0,
        'LOG_LEVEL': 'INFO',
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
        'ROBOTSTXT_OBEY': False
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.visited_urls = set()
        self.followed_external_domains = set()

    def parse(self, response, is_external_deep_dive=False):
        url = response.url
        if url in self.visited_urls:
            self.logger.debug(f"Skipping already visited URL: {url}")
            return
        self.visited_urls.add(url)
        self.logger.info(f"Parsing URL: {url} (is_external_deep_dive: {is_external_deep_dive})")

        title = response.css('title::text').get(default='').strip()
        description = (
            response.css('meta[name="description"]::attr(content)').get(default='').strip() or
            response.css('meta[property="og:description"]::attr(content)').get(default='').strip()
        )
        text_nodes = response.xpath('//body//text()[not(ancestor::script) and not(ancestor::style)]').getall()
        raw_text = ' '.join(text_nodes).strip()

        item = {
            'url': url,
            'title': title,
            'description': description,
            'raw_text_content': raw_text,
        }
        
        current_domain = urlparse(url).netloc.lower()
        is_kortrijkxpo_page = current_domain.endswith('kortrijkxpo.com')
        
        if is_kortrijkxpo_page:
            item['source_type'] = 'kortrijkxpo_site'
            if "/event/" in url:
                social_links_on_page = response.css('div.socialmedia_links a::attr(href)').getall()
                if social_links_on_page:
                    item['socialmedia_links'] = [response.urljoin(sl) for sl in social_links_on_page]
        elif is_external_deep_dive:
            item['source_type'] = 'external_event_subpage'
        elif current_domain in self.followed_external_domains:
            item['source_type'] = 'primary_external_event_site'
        else:
            item['source_type'] = 'other'

        yield item

        links_to_follow_next = []

        if current_domain in self.followed_external_domains and not is_external_deep_dive:
            self.logger.info(f"On primary external site {current_domain}, looking for booking/price links.")
            booking_keywords = ["book", "ticket", "reserv", "prijs", "tarie", "booking", "shop", "koop", "tarieven"]
            
            for anchor in response.css('a[href]'):
                href_attr = anchor.attrib.get('href', '')
                href_text_lower = ' '.join(anchor.css('::text').getall()).lower().strip()
                href_attr_lower = href_attr.lower()

                is_relevant_link = False
                if any(keyword in href_text_lower for keyword in booking_keywords):
                    is_relevant_link = True
                if any(keyword in href_attr_lower for keyword in booking_keywords):
                    is_relevant_link = True
                
                if is_relevant_link:
                    full_sub_link = response.urljoin(href_attr)
                    parsed_sub_link = urlparse(full_sub_link)
                    if parsed_sub_link.netloc == current_domain:
                        links_to_follow_next.append({'url': full_sub_link, 'is_deep_dive': True})
                        self.logger.info(f"Found potential booking/price sub-link to follow: {full_sub_link}")
        
        if not is_external_deep_dive:
            if is_kortrijkxpo_page:
                for href in response.css('a[href]::attr(href)').getall():
                    full_url = response.urljoin(href)
                    parsed = urlparse(full_url)
                    if parsed.scheme in ('http', 'https') and \
                       parsed.netloc.lower().endswith('kortrijkxpo.com') and \
                       parsed.path.startswith('/kalender/'):
                        links_to_follow_next.append({'url': full_url, 'is_deep_dive': False})

            if item.get('source_type') == 'kortrijkxpo_site' and "/event/" in url and 'socialmedia_links' in item:
                for ext_link_url in item['socialmedia_links']:
                    parsed_ext = urlparse(ext_link_url)
                    ext_domain = parsed_ext.netloc.lower()
                    if not any(ext_domain.endswith(bd) for bd in BLACKLISTED_DOMAINS):
                        links_to_follow_next.append({'url': ext_link_url, 'is_deep_dive': False})
                        self.followed_external_domains.add(ext_domain)
                        self.logger.info(f"Adding primary external link to follow: {ext_link_url} from domain {ext_domain}")
                    else:
                        self.logger.info(f"Skipping blacklisted external link from socialmedia_links: {ext_link_url}")

        for link_info in links_to_follow_next:
            link_to_visit = link_info['url']
            is_deep_dive_request = link_info['is_deep_dive']
            if link_to_visit not in self.visited_urls:
                yield scrapy.Request(link_to_visit, 
                                     callback=self.parse, 
                                     cb_kwargs={'is_external_deep_dive': is_deep_dive_request})
            else:
                self.logger.debug(f"Link {link_to_visit} already visited or in queue, skipping.") 