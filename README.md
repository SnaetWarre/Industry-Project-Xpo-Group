[![Version](https://img.shields.io/badge/version-1.0.0-blue)](CHANGELOG.md)

# Event Chatbot & Vector Embedding Service

This project provides a full-stack solution for event Q&A using Retrieval-Augmented Generation (RAG):
- **.NET-based vector embedding service** (Azure OpenAI + CosmosDB) for semantic search and storage
- **Scrapy-based web scraper** for ingesting event data
- **Next.js dashboard** for analytics and chat history
- **Javascript chatbot** for easy use of the chat api


---

## Project Structure

```
.
.
├── CHANGELOG.md
├── data
│   └── processed
│       ├── abiss_site_data_cleaned_cleaned.json
│       ├── abiss_site_data_cleaned.json
│       ├── abiss_site_data.json
│       ├── artisan_site_data_cleaned_cleaned.json
│       ├── artisan_site_data_cleaned.json
│       ├── artisan_site_data.json
│       ├── ffd_site_data_cleaned_cleaned.json
│       ├── ffd_site_data_cleaned.json
│       └── ffd_site_data.json
├── docker-compose.yml
├── .example.env
├── .gitignore
├── Industry-Project-Xpo-Group.sln
├── production
│   ├── dockerfile
│   ├── .env
│   ├── .example.env
│   ├── requirements.txt
│   ├── run_pipeline.sh
│   └── todo.txt
├── README.md
├── requirements.txt
├── scrapy.cfg
├── src
│   ├── dotnet
│   │   └── VectorEmbeddingService
│   │       ├── appsettings.example.json
│   │       ├── Controllers
│   │       │   ├── AbissController.cs
│   │       │   ├── AnalyticsController.cs
│   │       │   ├── AnalyticsDashboardController.cs
│   │       │   ├── ArtisanController.cs
│   │       │   ├── AuthController.cs
│   │       │   ├── ChatController.cs
│   │       │   └── FfdController.cs
│   │       ├── Dockerfile
│   │       ├── Models
│   │       │   ├── AnalyticsEvent.cs
│   │       │   ├── ChatRequest.cs
│   │       │   ├── EventDocument.cs
│   │       │   ├── SearchRequest.cs
│   │       │   └── UserProfile.cs
│   │       ├── Program.cs
│   │       ├── Properties
│   │       │   └── launchSettings.json
│   │       ├── Services
│   │       │   ├── AzureOpenAIEmbeddingService.cs
│   │       │   ├── CosmosDbService.cs
│   │       │   ├── ICosmosDbService.cs
│   │       │   └── IEmbeddingService.cs
│   │       ├── upload_to_vector_db.py
│   │       ├── vector_api_client.py
│   │       └── VectorEmbeddingService.csproj
│   ├── python
│   │   ├── scraper
│   │   │   ├── items.py
│   │   │   ├── middlewares.py
│   │   │   ├── settings.py
│   │   │   └── spiders
│   │   │       ├── event_site_spider_clean.py
│   │   │       └── event_site_spider.py
│   │   └── utils
│   │       └── clean_json.py
│   ├── web
│   │   ├── css
│   │   │   └── chatbot.css
│   │   ├── gdpr.pdf
│   │   ├── images
│   │   │   └── robot.svg
│   │   ├── importready
│   │   │   ├── abiss-bot.js
│   │   │   ├── artisan-bot.js
│   │   │   ├── ffd-bot.js
│   │   │   └── importtest.html
│   │   ├── index.html
│   │   └── js
│   │       └── chatbot.js
│   └── xpodashboard
│       ├── eslint.config.mjs
│       ├── .gitignore
│       ├── next.config.ts
│       ├── next-env.d.ts
│       ├── package.json
│       ├── package-lock.json
│       ├── postcss.config.mjs
│       ├── public
│       │   └── images
│       │       ├── kortrijk-xpo-logo.svg
│       │       └── kortrijk-xpo-logo-white.svg
│       ├── README.md
│       ├── src
│       │   ├── app
│       │   │   ├── auth
│       │   │   ├── chatgeschiedenis
│       │   │   ├── favicon.ico
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   └── (routes)
│       │   ├── components
│       │   │   ├── auth
│       │   │   ├── chatgeschiedenis
│       │   │   ├── core
│       │   │   └── dashboard
│       │   ├── context
│       │   │   └── SiteFilterContext.tsx
│       │   ├── lib
│       │   │   ├── config.ts
│       │   │   ├── providers
│       │   │   ├── services
│       │   │   └── types
│       │   └── services
│       │       └── api.ts
│       └── tsconfig.json
└── .vscode
    ├── settings.example.json
```

---

## Prerequisites

- **Docker & Docker Compose** (recommended for easy setup)
- **Node.js** (v20+)
- **.NET 8.0 SDK**
- **Python** (v3.11+)
- **Azure OpenAI** subscription with embedding and chat models deployed
- **Azure Cosmos DB** account

---

## Installation & Configuration Guide

### 1. Environment Configuration

#### Create Root Environment File
Copy the example environment file and configure credentials:

```bash
cp .example.env .env
```

Edit `.env` with your credentials:
```bash
UPLOAD_SERVICE_USERNAME=your_username
UPLOAD_SERVICE_PASSWORD=your_password
```

#### Configure .NET Backend Settings
Create the backend configuration file:

```bash
cp src/dotnet/VectorEmbeddingService/appsettings.example.json src/dotnet/VectorEmbeddingService/appsettings.json
```

Edit `src/dotnet/VectorEmbeddingService/appsettings.json` with your Azure credentials:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "CosmosDb": {
    "ConnectionString": "AccountEndpoint=https://your-cosmos-db.documents.azure.com:443/;AccountKey=your-account-key;",
    "DatabaseName": "YourDatabaseName"
  },
  "AzureOpenAIEmbedding": {
    "Endpoint": "https://your-openai-resource.openai.azure.com/",
    "ApiKey": "your-api-key",
    "EmbeddingDeploymentName": "text-embedding-ada-002"   
  },
  "AzureOpenAIChat": {
    "Endpoint": "https://your-openai-resource.cognitiveservices.azure.com/",
    "ApiKey": "your-api-key",
    "ChatDeploymentName": "gpt-4",
    "ApiVersion": "2024-02-15-preview"
  },
  "Jwt": {
    "Key": "your-secure-jwt-key-at-least-32-characters-long",
    "Issuer": "YourServiceName",
    "Audience": "YourAudience"
  },
  "Users": [
    {
      "Username": "admin@example.com",
      "Password": "your-secure-password",
      "Name": "Admin User",
      "Role": "Admin"
    },
    {
      "Username": "service-account",
      "Password": "your-secure-password"
    }
  ]
}
```

### 2. Docker Deployment (Recommended)

#### Quick Start with Docker Compose

1. **Clone the repository and navigate to the project root:**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Configure environment files** (see section 1 above)

3. **Build and run all services:**
   ```bash
   docker-compose up --build
   ```

This will start:
- **Backend API** on `http://localhost:5000` (HTTP)
- **Next.js Dashboard** on `http://localhost:3000`
- **Pipeline container** for data processing (runs in background)

#### Docker Services Overview

| Service | Description | Port | Status |
|---------|-------------|------|--------|
| `backend` | .NET Vector Embedding API | 5000/5000 | Always running |
| `xpodashboard` | Next.js Analytics Dashboard | 3000 | Always running |
| `pipeline` | Python scraper & data processor | N/A | Background service |

#### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Restart specific service
docker-compose restart [service-name]

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build

# Access container shell
docker exec -it [container-name] bash
```

### 3. Local Development Setup

For development with live reload and debugging capabilities:

#### Backend (.NET API)
```bash
cd src/dotnet/VectorEmbeddingService
dotnet restore
dotnet build
dotnet run
```
Service runs on `https://localhost:5000` and `http://localhost:5000`

#### Frontend (Next.js Dashboard)
```bash
cd src/xpodashboard
npm install
npm run dev
```
Dashboard runs on `http://localhost:3000`

#### Python Environment & Scraper
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Run scraper
cd src/python/scraper
scrapy crawl event_spider

# Clean scraped data
python src/python/utils/clean_json.py
```

### 4 Data Upload & Processing

#### Upload Event Data to Vector Database
```bash
# Using Docker (recommended)
docker exec -it pipeline python src/dotnet/VectorEmbeddingService/upload_to_vector_db.py data/processed/ffd_site_data_cleaned.json --api-url http://backend:5000

# Using local Python environment
python src/dotnet/VectorEmbeddingService/upload_to_vector_db.py data/processed/ffd_site_data_cleaned.json --api-url http://localhost:5000
```

#### Available Datasets
- `data/processed/abiss_site_data_cleaned.json`
- `data/processed/artisan_site_data_cleaned.json`
- `data/processed/ffd_site_data_cleaned.json`

---

## Usage

### Service URLs (Docker)
- **Backend API**: `http://localhost:5000` (HTTP)
- **Dashboard**: `http://localhost:3000`
- **Chatbot Frontend**: `http://localhost:5500` (using VS Code Live Server)

### Web Interface (Chatbot)

#### Using the Main Chatbot Interface
The main chatbot interface (`src/web/index.html`) provides a complete chat experience with bot selection:

1. **Start VS Code Live Server:**
   - Install the "Live Server" extension in VS Code
   - Right-click on `src/web/index.html`
   - Select "Open with Live Server"
   - Access at `http://localhost:5500`

2. **Features:**
   - **Bot Selection**: Choose between FFDBot, ArtisanBot, and AbissBot using the dropdown
   - **Interactive Chat**: Real-time messaging with AI responses
   - **Privacy Compliance**: Built-in GDPR disclaimer and privacy policy link
   - **Responsive Design**: Mobile-friendly interface

#### Using Individual Bot Modules
For integration into existing websites, use the individual bot modules in `src/web/importready/`:

**Available Modules:**
- `abiss-bot.js` - AbissBot for Abiss event
- `artisan-bot.js` - ArtisanBot for Artisan event  
- `ffd-bot.js` - FFDBot for FFD event

**Integration Example:**
```html
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website with FFDBot</title>
    <link rel="stylesheet" href="../css/chatbot.css">
    <script type="module" src="ffd-bot.js"></script>
</head>
<body>
    <!-- Your existing website content -->
    <!-- The bot script will automatically inject the chatbot -->
</body>
</html>
```

**Usage:**
1. Copy the desired bot module (e.g., `ffd-bot.js`) to your website
2. Copy `css/chatbot.css` for styling
3. Import the module as shown above
4. The chatbot will automatically appear on your page

### API Endpoints
- `POST /api/chat/{event-type}` - Chat with specific event bot
- `GET /api/analytics/dashboard` - Get analytics data
- `POST /api/auth/login` - User authentication
- `GET /api/search/{event-type}` - Search event data

### Development Workflow

1. **Start services** with Docker Compose
2. **Upload event data** using the upload script
3. **Access dashboard** at `http://localhost:3000`
4. **Test chatbot** using VS Code Live Server on `src/web/index.html`
5. **Monitor logs** with `docker-compose logs -f`

---

## Main Components
- **src/python/scraper/**: Scrapy spiders for event data collection
- **src/dotnet/VectorEmbeddingService/**: .NET WebAPI for embedding, search, and DB operations
- **src/xpodashboard/**: Next.js dashboard for analytics and chat history
- **data/processed/**: Cleaned event data JSONs ready for upload
- **src/web/**: Vanilla JS frontend for chatbot interface

---

## Data Flow
1. **Scraper** collects event data → outputs JSON to `data/processed/`
2. **Upload script** sends data to .NET API, which creates embeddings and stores in CosmosDB
3. **Chatbot** queries .NET API for relevant events, then uses LLM to generate responses
4. **Dashboard** visualizes analytics, user interactions, and chat history

---

## Troubleshooting

### Common Issues

**Docker build fails:**
```bash
# Clean Docker cache
docker system prune -a
docker-compose build --no-cache
```

**Backend connection issues:**
- Verify `appsettings.json` configuration
- Check Azure OpenAI and CosmosDB credentials
- Ensure ports 5000/5000 are available

**Frontend not connecting to API:**
- Check API URL in frontend configuration
- Verify CORS settings in backend
- Confirm services are running: `docker-compose ps`

---

## Configuration Files Reference

| File | Purpose | Required |
|------|---------|----------|
| `.env` | Root environment variables | Yes |
| `appsettings.json` | .NET backend configuration | Yes |
| `docker-compose.yml` | Container orchestration | No (for Docker) |

---

## Release Notes
See [CHANGELOG.md](CHANGELOG.md) for details on new features, fixes, and improvements. 