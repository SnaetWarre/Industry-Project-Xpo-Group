#!/bin/bash
set -e

# 1. Scrape and clean (output goes directly to data/processed/)
scrapy crawl event_site_spider_clean -a start_url=https://www.flandersflooringdays.com -a event_id=ffd -O data/processed/ffd_site_data_cleaned.json
scrapy crawl event_site_spider_clean -a start_url=https://www.artisan-xpo.be -a event_id=artisan -O data/processed/artisan_site_data_cleaned.json
scrapy crawl event_site_spider_clean -a start_url=https://www.abissummit.be -a event_id=abiss -O data/processed/abiss_site_data_cleaned.json

# 2. Upload to backend (use HTTP for internal Azure, HTTPS for public)
python src/dotnet/VectorEmbeddingService/upload_to_vector_db.py --api-url $API_URL --container ffd data/processed/ffd_site_data_cleaned.json
python src/dotnet/VectorEmbeddingService/upload_to_vector_db.py --api-url $API_URL --container artisan data/processed/artisan_site_data_cleaned.json
python src/dotnet/VectorEmbeddingService/upload_to_vector_db.py --api-url $API_URL --container abiss data/processed/abiss_site_data_cleaned.json