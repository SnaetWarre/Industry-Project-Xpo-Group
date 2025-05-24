from src.python.scraper.spiders.event_site_spider import EventSiteSpider
import subprocess
from pathlib import Path
import json
from scrapy import signals
from scrapy.extensions.feedexport import FeedExporter
import time

class EventSiteSpiderClean(EventSiteSpider):
    """A version of EventSiteSpider that automatically cleans the JSON output after crawling.
    
    Usage example:
        scrapy crawl event_site_spider_clean -a start_url=https://www.flandersflooringdays.com -a event_id=ffd -O ffd_site_data.json
    """
    
    name = "event_site_spider_clean"
    
    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super().from_crawler(crawler, *args, **kwargs)
        # Connect to the feed_exporter_closed signal
        crawler.signals.connect(spider.feed_exporter_closed, signal=signals.feed_exporter_closed)
        return spider
    
    def feed_exporter_closed(self, *args, **kwargs):
        """Called when the feed exporter is closed."""
        self.logger.info("Feed exporter closed signal received")
        
        # Get the output file from command line arguments
        output_file = self.crawler.settings.get('FEEDS', {}).get('ffd_site_data.json', {}).get('uri')
        if not output_file:
            output_file = 'ffd_site_data.json'  # Default to the command line specified file

        # Always place output in data/processed
        output_file = str(Path('data/processed') / Path(output_file).name)
        self.logger.info(f"Found output file: {output_file}")
        
        # Wait a moment for the file to be fully written
        time.sleep(1)
        
        try:
            # Create output filename for cleaned version
            input_file = output_file
            output_file = str(Path('data/processed') / (Path(output_file).with_suffix('').name + '_cleaned.json'))
            
            # Run the cleaning process
            self.logger.info(f"Starting JSON cleaning process: {input_file} -> {output_file}")
            subprocess.run([
                'python',
                'src/python/utils/clean_json.py',
                input_file,
                '-o', output_file,
                '-i',  # Indent the output
                '-c',  # Collapse whitespace
                '--remove-non-ascii'  # Remove non-ASCII characters
            ], check=True)
            self.logger.info(f"Successfully cleaned JSON file: {output_file}")
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to clean JSON file: {e}")
        except Exception as e:
            self.logger.error(f"Unexpected error while cleaning JSON: {e}") 