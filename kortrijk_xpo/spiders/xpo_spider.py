import scrapy
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor
from urllib.parse import urljoin, urlparse
import json
import logging
import re

class XpoEventSpider(CrawlSpider):
    name = 'xpo_event_spider'
    allowed_domains = []  # Allow all domains for external links, OffsiteMiddleware is handled by this
    start_urls = ['https://www.kortrijkxpo.com/kalender/']
    
    rules = (
        # Rule to follow event detail pages from kortrijkxpo.com
        Rule(
            LinkExtractor(
                allow=('/kalender/event/pxk/\\d+/[^/]+/$',),  # Properly escaped \d+ in normal string
                deny=('/kalender/event/pxk/\\d+/[^/]+/.+/$',), # Properly escaped \d+ in normal string, deny deeper paths
                allow_domains=['kortrijkxpo.com'] 
            ),
            callback='parse_event_detail',
            follow=True # Follow links from start_urls to find event pages
        ),
    )

    def __init__(self, *args, **kwargs):
        super(XpoEventSpider, self).__init__(*args, **kwargs)
        self.events = [] # This will store the final, complete event items
        self.visited_event_urls = set() # To avoid re-processing event detail pages
        # self.crawled_external_domains = set() # No longer strictly needed with allowed_domains = []
        # self.logger.info("XpoEventSpider initialized. Cache is currently {} in settings.".format(
        #     self.settings.get('HTTPCACHE_ENABLED', 'Not Set (defaulting to True/Enabled typically)')
        # )) # REMOVED: self.settings not directly available here, cache status is handled by run_spider.py
        # For ensuring an event item (with all its external data) is added only once to self.events
        self.completed_event_identifiers = set()


    def _extract_text_content(self, response):
        # Extracts and cleans text from the body, excluding script and style tags
        text_nodes = response.xpath('//body//text()[not(ancestor::script) and not(ancestor::style)]').getall()
        raw_text = ' '.join(text_nodes).strip()
        cleaned_text = re.sub(r'\\s+', ' ', raw_text).strip()
        return cleaned_text

    def _find_ticket_link(self, response):
        ticket_keywords = ['ticket', 'tickets', 'kaart', 'kaarten', 'kopen', 'koop', 'order', 'bestel', 'register', 'inschrijven', 'preorder']
        # Prioritize links with explicit ticket-related text
        for link_el in response.css('a[href]'):
            link_text = ''.join(link_el.css('::text').getall()).lower()
            link_href = link_el.attrib.get('href', '').lower()
            if (any(keyword in link_text for keyword in ticket_keywords) or
                any(keyword in link_href for keyword in ticket_keywords)):
                url = link_el.attrib.get('href')
                if url and (url.startswith('http') or url.startswith('/')):
                    return response.urljoin(url)
        # Fallback: check for button-like elements or specific attributes
        for btn_el in response.css('button, [role="button"], [onclick*="ticket"], [class*="ticket"]'):
            # This is a very broad search, might need refinement
            # Attempt to find a URL if it's a form button or has a data-url attribute
            form_action = btn_el.xpath("./ancestor-or-self::form/@action").get()
            if form_action: return response.urljoin(form_action)
            data_href = btn_el.xpath("./@data-href | ./@data-url").get()
            if data_href: return response.urljoin(data_href)
        return None

    def _find_contact_info(self, response):
        contact_info = {}
        page_text = " ".join(response.css('body ::text').getall())

        # Email
        emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', page_text)
        if emails:
            contact_info['email'] = list(set(emails))

        # Phone
        # Regex allows for international, spaces, dots, dashes, parentheses
        phones = re.findall(r'(\\+?\\d[\\s.-]?\\d{1,3}[\\s.-]?)?(\\(\\d{1,4}\\))?[\\s.-]?\\d{1,4}[\\s.-]?\\d{1,4}[\\s.-]?\\d{1,9}', page_text)
        cleaned_phones = []
        for p_tuple in phones:
            p_str = "".join(filter(None, p_tuple)) # Join non-empty parts of the tuple
            p_digits = re.sub(r'\\D', '', p_str) # Keep only digits
            if len(p_digits) >= 8: # Basic validation for length
                 cleaned_phones.append(p_digits)
        if cleaned_phones:
            contact_info['phone'] = list(set(cleaned_phones))
        
        # Address (very basic, looks for patterns with street names, numbers, postal codes)
        # This is highly heuristic and might need significant improvement or a dedicated library.
        # Example: finds lines with numbers and common street suffixes.
        address_keywords = ['straat', 'laan', 'weg', 'plein', 'boulevard', 'address', 'adres', 'doorniksesteenweg']
        potential_addresses = []
        body_text_lines = [line.strip() for line in page_text.split('\\n') if line.strip()]

        for line in body_text_lines:
            if any(keyword in line.lower() for keyword in address_keywords) and re.search(r'\\d', line):
                 # Further clean up common prefixes or irrelevant parts if possible
                line = re.sub(r'^(Adres|Address):\\s*', '', line, flags=re.IGNORECASE).strip()
                potential_addresses.append(line)
        
        if potential_addresses:
            # Deduplicate while preserving order (roughly)
            contact_info['address'] = list(dict.fromkeys(potential_addresses))

        return contact_info

    def parse_event_detail(self, response):
        if response.url in self.visited_event_urls:
            self.logger.debug(f"Already processed event detail page: {response.url}")
            return
        self.visited_event_urls.add(response.url)

        event_title = response.css('h1::text').get('').strip()
        event_identifier = f"{event_title}_{response.url}" # Unique key for this event

        event_item = {
            'title': event_title,
            'date': response.css('.event-date::text').get(), # Adjust selectors as needed
            'location': response.css('.event-location::text').get(), # Adjust selectors as needed
            'image_url': response.urljoin(response.css('meta[property="og:image"]::attr(content)').get() or response.css('.event-image img::attr(src)').get('dummy.jpg')),
            'event_url': response.url,
            'description': response.css('meta[property="og:description"]::attr(content)').get() or ' '.join(response.css('.event-description ::text').getall()).strip(),
            'contact_email_on_main_site': response.css('a[href^="mailto:"]::attr(href)').re_first(r'mailto:(.*)'),
            'external_data': [],
            'pending_external_links': 0, # Counter for async external requests
            '_internal_event_identifier': event_identifier # For tracking completion
        }
        
        self.logger.info(f"Parsing event detail: {event_item.get('title', response.url)}")

        external_requests_to_make = []
        processed_external_urls = set()

        # Find all unique, valid HTTP/HTTPS external links
        for link_el in response.css('a[href]'):
            href = link_el.attrib.get('href')
            if href:
                full_url = response.urljoin(href)
                try:
                    parsed_url = urlparse(full_url)
                    if (parsed_url.scheme in ['http', 'https'] and 
                        parsed_url.netloc and
                        parsed_url.netloc.lower() not in ['kortrijkxpo.com', 'www.kortrijkxpo.com'] and
                        full_url not in processed_external_urls):
                        
                        processed_external_urls.add(full_url)
                        self.logger.debug(f"Event '{event_item.get('title')}': Found external link {full_url}")
                        
                        external_requests_to_make.append(
                            scrapy.Request(
                                full_url,
                                callback=self.parse_external_site_content,
                                meta={
                                    'event_item_ref': event_item, # Pass a reference to the main event item
                                    'depth': response.meta.get('depth', 0) + 1,
                                },
                                errback=self.handle_external_error,
                                cb_kwargs={'original_event_url': response.url, 'external_url': full_url}
                            )
                        )
                except ValueError:
                    self.logger.warning(f"Event '{event_item.get('title')}': Could not parse URL: {full_url} (from original: {href})")

        if not external_requests_to_make:
            self.logger.info(f"Event '{event_item.get('title')}' has no external links to crawl. Adding to main list.")
            if event_item['_internal_event_identifier'] not in self.completed_event_identifiers:
                # Remove temporary fields before saving
                final_event_item = {k: v for k, v in event_item.items() if not k.startswith('_')}
                self.events.append(final_event_item)
                self.completed_event_identifiers.add(event_item['_internal_event_identifier'])
            # yield event_item # If pipelines are active and expect items immediately
        else:
            event_item['pending_external_links'] = len(external_requests_to_make)
            self.logger.info(f"Event '{event_item.get('title')}' has {len(external_requests_to_make)} external links. Dispatching requests.")
            for req in external_requests_to_make:
                yield req # Yield requests, actual item saving will be handled by callback

    def parse_external_site_content(self, response, original_event_url, external_url):
        event_item_ref = response.meta['event_item_ref']
        self.logger.info(f"Processing external URL: {external_url} for event: {event_item_ref.get('title')}")

        external_page_data = {
            'url': external_url,
            'status': 'success', # Assume success unless errback is called
            'title': response.css('title::text').get('').strip(),
            'description': (response.css('meta[name="description"]::attr(content)').get('').strip() or
                           response.css('meta[property="og:description"]::attr(content)').get('').strip()),
            'ticket_url': self._find_ticket_link(response),
            'contact_info': self._find_contact_info(response),
            'raw_text_content': self._extract_text_content(response)
        }
        event_item_ref['external_data'].append(external_page_data)
        event_item_ref['pending_external_links'] -= 1

        self.logger.debug(f"Event '{event_item_ref.get('title')}': Processed external link {external_url}. Pending: {event_item_ref['pending_external_links']}")

        if event_item_ref['pending_external_links'] <= 0:
            self.logger.info(f"All external links processed for event: {event_item_ref.get('title')}. Adding to main list.")
            if event_item_ref['_internal_event_identifier'] not in self.completed_event_identifiers:
                # Remove temporary fields before saving
                final_event_item = {k: v for k, v in event_item_ref.items() if not k.startswith('_')}
                self.events.append(final_event_item)
                self.completed_event_identifiers.add(event_item_ref['_internal_event_identifier'])
            # yield event_item_ref # If pipelines expect the item at this stage

    def handle_external_error(self, failure):
        request = failure.request
        external_url = request.url
        event_item_ref = request.meta.get('event_item_ref', {}) # Ensure event_item_ref exists
        event_title = event_item_ref.get('title', 'Unknown Event')
        
        self.logger.error(f"Error processing external URL {external_url} for event '{event_title}': {failure.value}")

        error_data = {
            'url': external_url,
            'status': 'error',
            'error_message': str(failure.value),
            'title': None,
            'description': None,
            'ticket_url': None,
            'contact_info': {},
            'raw_text_content': None
        }
        
        if event_item_ref: # Check if event_item_ref is not empty
            event_item_ref.setdefault('external_data', []).append(error_data) # Ensure external_data exists
            event_item_ref.setdefault('pending_external_links', 1) # Ensure counter exists
            event_item_ref['pending_external_links'] -= 1

            if event_item_ref['pending_external_links'] <= 0:
                self.logger.info(f"All external links (including errors) processed for event: {event_title}. Adding to main list.")
                if event_item_ref.get('_internal_event_identifier') and event_item_ref['_internal_event_identifier'] not in self.completed_event_identifiers:
                     final_event_item = {k: v for k, v in event_item_ref.items() if not k.startswith('_')}
                     self.events.append(final_event_item)
                     self.completed_event_identifiers.add(event_item_ref['_internal_event_identifier'])
        else:
            self.logger.error(f"Could not find event_item_ref in meta for failed request: {external_url}")

    def closed(self, reason):
        self.logger.info(f"Spider closed: {reason}. Processed {len(self.events)} complete events.")
        
        # Save to events.json
        try:
            with open('events.json', 'w', encoding='utf-8') as f:
                json.dump(self.events, f, ensure_ascii=False, indent=2)
            self.logger.info(f"Successfully saved {len(self.events)} events to events.json")
        except IOError as e:
            self.logger.error(f"Could not write to events.json: {e}")
        except TypeError as e:
            self.logger.error(f"TypeError during JSON serialization for events.json: {e}")

        # Generate debug_page.html
        html_content = """\
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scraped Event Data (for LLM Context)</title>
    <style>
        body { font-family: sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
        .event { background-color: #fff; border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .event h2 { color: #0056b3; margin-top: 0; }
        .event h3 { color: #007bff; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 20px; }
        .external-event { background-color: #e9f7fd; border: 1px solid #bce8f1; margin-top: 15px; padding: 10px; border-radius: 4px; }
        .external-event h4 { color: #31708f; margin-top: 0; }
        .external-event p, .event p { margin: 5px 0; }
        .raw-text { background-color: #f9f9f9; border: 1px dashed #ccc; padding: 10px; margin-top:10px; white-space: pre-wrap; word-wrap: break-word; max-height: 300px; overflow-y: auto; font-size: 0.9em; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        dt { font-weight: bold; margin-top: 5px;}
        dd { margin-left: 20px; margin-bottom: 5px;}
    </style>
</head>
<body>
    <h1>Kortrijk Xpo - Scraped Event Data</h1>
"""
        if not self.events:
            html_content += "<p>No events were scraped or available to display.</p>"
        
        for i, event_data in enumerate(self.events):
            html_content += f"<div class='event' id='event-{i+1}'>\n"
            html_content += f"<h2>{event_data.get('title', 'N/A')}</h2>\n"
            html_content += f"<p><strong>KortrijkXpo URL:</strong> <a href='{event_data.get('event_url', '#')}' target='_blank'>{event_data.get('event_url', 'N/A')}</a></p>\n"
            html_content += f"<p><strong>Date:</strong> {event_data.get('date', 'N/A')}</p>\n"
            html_content += f"<p><strong>Location:</strong> {event_data.get('location', 'N/A')}</p>\n"
            if event_data.get('image_url') and event_data.get('image_url') != 'dummy.jpg':
                 html_content += f"<p><img src='{event_data.get('image_url')}' alt='Event image for {event_data.get('title', '')}' style='max-width:200px; height:auto;'/></p>\n"
            html_content += f"<p><strong>Description (from KortrijkXpo):</strong> {event_data.get('description', 'N/A')}</p>\n"
            if event_data.get('contact_email_on_main_site'):
                html_content += f"<p><strong>Contact Email (from KortrijkXpo):</strong> <a href='mailto:{event_data.get('contact_email_on_main_site')}'>{event_data.get('contact_email_on_main_site')}</a></p>\n"

            if event_data.get('external_data'):
                html_content += "<h3>External Site Data:</h3>\n"
                for j, ext_data in enumerate(event_data['external_data']):
                    html_content += f"<div class='external-event' id='event-{i+1}-ext-{j+1}'>\n"
                    html_content += f"<h4>External Link: <a href='{ext_data.get('url', '#')}' target='_blank'>{ext_data.get('url', 'N/A')}</a></h4>\n"
                    if ext_data.get('status') == 'error':
                        html_content += f"<p><strong>Status:</strong> Error - {ext_data.get('error_message', 'Unknown error')}</p>\n"
                    else:
                        html_content += f"<p><strong>Title:</strong> {ext_data.get('title', 'N/A')}</p>\n"
                        html_content += f"<p><strong>Description:</strong> {ext_data.get('description', 'N/A')}</p>\n"
                        if ext_data.get('ticket_url'):
                            html_content += f"<p><strong>Ticket URL:</strong> <a href='{ext_data.get('ticket_url')}' target='_blank'>{ext_data.get('ticket_url')}</a></p>\n"
                        
                        contacts = ext_data.get('contact_info', {})
                        if contacts:
                            html_content += "<dl>\n"
                            if contacts.get('email'):
                                html_content += f"<dt>Email(s):</dt><dd>{', '.join(contacts['email'])}</dd>\n"
                            if contacts.get('phone'):
                                html_content += f"<dt>Phone(s):</dt><dd>{', '.join(contacts['phone'])}</dd>\n"
                            if contacts.get('address'):
                                html_content += f"<dt>Address(es):</dt><dd>{'<br>'.join(contacts['address'])}</dd>\n"
                            html_content += "</dl>\n"

                        if ext_data.get('raw_text_content'):
                            html_content += "<h5>Raw Text Content (from external page):</h5>\n"
                            html_content += f"<div class='raw-text'>{ext_data.get('raw_text_content')}</div>\n"
                        else:
                            html_content += "<p>No raw text content extracted.</p>"
                    html_content += "</div>\n"
            else:
                html_content += "<p>No external site data found/processed for this event.</p>\n"
            html_content += "</div>\n"

        html_content += """\
</body>
</html>
"""
        try:
            with open('debug_page.html', 'w', encoding='utf-8') as f:
                f.write(html_content)
            self.logger.info(f"Successfully generated debug_page.html with {len(self.events)} events.")
        except IOError as e:
            self.logger.error(f"Could not write to debug_page.html: {e}") 