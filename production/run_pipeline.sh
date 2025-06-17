#!/bin/bash
set -e

echo "Starting XPO Event Data Pipeline..."
echo "Timestamp: $(date)"

# Validate required environment variables
if [ -z "$API_URL" ]; then
    echo "Error: API_URL environment variable is required"
    exit 1
fi

if [ -z "$UPLOAD_SERVICE_USERNAME" ] || [ -z "$UPLOAD_SERVICE_PASSWORD" ]; then
    echo "Error: UPLOAD_SERVICE_USERNAME and UPLOAD_SERVICE_PASSWORD are required"
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p data/processed

echo "=== Phase 1: Scraping Event Sites ==="

# 1. Scrape Flanders Flooring Days
echo "Scraping Flanders Flooring Days..."
scrapy crawl event_site_spider_clean \
    -a start_url=https://www.flandersflooringdays.com \
    -a event_id=ffd \
    -O data/processed/ffd_site_data.json

# 2. Scrape Artisan XPO
echo "Scraping Artisan XPO..."
scrapy crawl event_site_spider_clean \
    -a start_url=https://www.artisan-xpo.be \
    -a event_id=artisan \
    -O data/processed/artisan_site_data.json

# 3. Scrape ABISS Summit
echo "Scraping ABISS Summit..."
scrapy crawl event_site_spider_clean \
    -a start_url=https://www.abissummit.be \
    -a event_id=abiss \
    -O data/processed/abiss_site_data.json

echo "=== Phase 2: Uploading to Vector Database ==="

# Check if cleaned files exist (created by the spider_clean variant)
FILES=(
    "data/processed/ffd_site_data_cleaned.json:ffd"
    "data/processed/artisan_site_data_cleaned.json:artisan"
    "data/processed/abiss_site_data_cleaned.json:abiss"
)

for file_info in "${FILES[@]}"; do
    IFS=':' read -r file_path container_name <<< "$file_info"

    if [ -f "$file_path" ]; then
        echo "Uploading $file_path to container '$container_name'..."
        python src/dotnet/VectorEmbeddingService/upload_to_vector_db.py \
            --api-url "$API_URL" \
            --container "$container_name" \
            "$file_path"
        echo "✓ Upload completed for $container_name"
    else
        echo "⚠ Warning: $file_path not found, skipping upload for $container_name"
    fi
done

echo "=== Pipeline Completed Successfully ==="
echo "Timestamp: $(date)"
echo "Data files saved in: $(pwd)/data/processed/"
echo "API endpoint used: $API_URL"
