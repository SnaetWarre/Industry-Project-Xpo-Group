[![Version](https://img.shields.io/badge/version-0.2.0-blue)](CHANGELOG.md)

# Event Chatbot & Vector Embedding Service

This project provides a full-stack solution for event Q&A using Retrieval-Augmented Generation (RAG):
- **.NET-based vector embedding service** (Azure OpenAI + CosmosDB) for semantic search and storage
- **Scrapy-based web scraper** for ingesting event data

---

## Project Structure

```
.
├── CHANGELOG.md
├── data
│   └── processed
│       ├── abiss_site_data_cleaned.json
│       ├── abiss_site_data.json
│       ├── artisan_site_data_cleaned.json
│       ├── artisan_site_data.json
│       ├── ffd_site_data_cleaned.json
│       └── ffd_site_data.json
├── docs
│   └── overview.html
├── Industry-Project-Xpo-Group.sln
├── plan.md
├── README.md
├── requirements.txt
├── scrapy.cfg
└── src
    ├── dotnet
    │   └── VectorEmbeddingService
    │       ├── appsettings.example.json
    │       ├── appsettings.json
    │       ├── bin
    │       ├── Controllers
    │       │   ├── AbissController.cs
    │       │   ├── AnalyticsController.cs
    │       │   ├── AnalyticsDashboardController.cs
    │       │   ├── ArtisanController.cs
    │       │   ├── AuthController.cs
    │       │   ├── ChatController.cs
    │       │   ├── FfdController.cs
    │       ├── Models
    │       │   ├── AnalyticsEvent.cs
    │       │   ├── ChatRequest.cs
    │       │   ├── EventDocument.cs
    │       │   ├── SearchRequest.cs
    │       │   └── UserProfile.cs
    │       ├── obj
    │       ├── Program.cs
    │       ├── Services
    │       │   ├── AzureOpenAIEmbeddingService.cs
    │       │   ├── CosmosDbService.cs
    │       │   ├── ICosmosDbService.cs
    │       │   └── IEmbeddingService.cs
    │       ├── upload_to_vector_db.py
    │       ├── vector_api_client.py
    │       └── VectorEmbeddingService.csproj
    ├── python
    │   ├── scraper
    │   │   ├── items.py
    │   │   ├── middlewares.py
    │   │   ├── settings.py
    │   │   └── spiders
    │   │       ├── event_site_spider.py
    │   │       └── event_site_spider_clean.py
    │   └── utils
    │       └── clean_json.py
    └── web
        ├── css
        │   └── chatbot.css
        ├── images
        │   └── robot.svg
        ├── importready
        │   ├── abiss-bot.js
        │   ├── artisan-bot.js
        │   ├── ffd-bot.js
        │   └── importtest.html
        ├── index.html
        └── js
            └── chatbot.js
```

---

## Setup & Usage

### 1. Python Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

- **Chatbot:**
  ```bash
  python src/python/chatbot/chatbot.py --api-url http://localhost:5000
  ```
- **Scraper:**
  - Configure and run spiders in `src/python/scraper/spiders/`
  - Clean/process output with `src/python/utils/clean_json.py`

### 2. .NET Vector Embedding Service

```bash
cd src/dotnet/VectorEmbeddingService
# Copy and configure appsettings.json (see appsettings.example.json)
dotnet restore
dotnet build
dotnet run
```
- Service runs on `http://localhost:5000` by default
- Handles embedding, search, and CosmosDB storage

### 3. Uploading Data to Vector DB

```bash
python src/dotnet/VectorEmbeddingService/upload_to_vector_db.py data/processed/ffd_site_data_cleaned.json --api-url http://localhost:5000
```
- Use for each event dataset you want to index

---

## Main Components
- **src/python/scraper/**: Scrapy spiders for event data
- **src/dotnet/VectorEmbeddingService/**: .NET WebAPI for embedding, search, and DB
- **data/processed/**: Cleaned event data JSONs
- **web/**: Frontend in Vanilla JS


---

## Data Flow
1. **Scraper** collects event data → outputs JSON
2. **Upload script** sends data to .NET API, which embeds and stores in CosmosDB
3. **Chatbot** queries .NET API for relevant events, then uses LLM to answer user

---

## Configuration
- **appsettings.json** in `src/dotnet/VectorEmbeddingService/` for Azure/Cosmos/OpenAI keys
- **requirements.txt** for Python dependencies

---

## Notes
- Adjust embedding chunk size in `AzureOpenAIEmbeddingService.cs` if your model supports more tokens per request.
- For large events, consider chunking text before upload for best retrieval.
- All REST endpoints are under `/api/events/` (see `EventsController.cs`). 