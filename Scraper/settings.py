BOT_NAME = "Scraper"

SPIDER_MODULES = ["Scraper.spiders"]
NEWSPIDER_MODULE = "Scraper.spiders"

# Crawl responsibly by identifying yourself (and your website) on the user-agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"

# Obey robots.txt rules
ROBOTSTXT_OBEY = False

# Configure maximum concurrent requests performed by Scrapy (default: 16)
CONCURRENT_REQUESTS = 8

# Configure a delay for requests for the same website (default: 0)
DOWNLOAD_DELAY = 1

# Enable or disable downloader middlewares
DOWNLOADER_MIDDLEWARES = {
    "Scraper.middlewares.KortrijkXpoDownloaderMiddleware": 543,
}


# Enable and configure HTTP caching
HTTPCACHE_ENABLED = False
HTTPCACHE_EXPIRATION_SECS = 0
HTTPCACHE_DIR = "httpcache"
HTTPCACHE_IGNORE_HTTP_CODES = []
HTTPCACHE_STORAGE = "scrapy.extensions.httpcache.FilesystemCacheStorage"
DUPEFILTER_DEBUG = True

# Set settings whose default value is deprecated to a future-proof value
REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
FEED_EXPORT_ENCODING = "utf-8"

# Explicitly set the Twisted reactor and asyncio event loop
# This can help resolve "Error loading object '': not a full path" issues.
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
# For Linux/macOS. For Windows, you might need "asyncio.ProactorEventLoop",
# but SelectorEventLoop is generally more compatible.
ASYNCIO_EVENT_LOOP = "asyncio.SelectorEventLoop" 