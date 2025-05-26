import scrapy

class KortrijkXpoItem(scrapy.Item):
    title = scrapy.Field()
    date = scrapy.Field()
    description = scrapy.Field()
    image_url = scrapy.Field()
    url = scrapy.Field()
    location = scrapy.Field()
    contact_email = scrapy.Field()
    opening_hours = scrapy.Field()
    external_url = scrapy.Field() 