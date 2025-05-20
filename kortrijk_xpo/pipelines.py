import json

class KortrijkXpoPipeline:
    def __init__(self):
        self.file = None
        self.items = []

    def open_spider(self, spider):
        self.file = open('events.json', 'w', encoding='utf-8')
        self.items = []

    def close_spider(self, spider):
        json.dump(self.items, self.file, ensure_ascii=False, indent=2)
        self.file.close()

    def process_item(self, item, spider):
        self.items.append(dict(item))
        return item 