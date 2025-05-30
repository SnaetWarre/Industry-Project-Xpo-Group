# AI Chatbot Integration Plan for Kortrijk Xpo & Event Microsites

**Document version:** 2025-05-29  
**Authors:** MCT Industry Project Student Group (Howest)  
**Scope:** Flanders Flooring Days (FFD), Artisan-Xpo, Abiss Summit

---

## 1. Objectives
1. On-site virtual assistant answering practical and in-depth event questions.  
2. Deflect repetitive support requests via data-driven retrieval.  
3. Leverage Python scraper and .NET VectorEmbeddingService (C#) with Azure OpenAI & Cosmos DB, plus a lightweight web widget.

---

## 2. High-level roadmap
| Phase | Target week | Deliverables |
|---|---|---|
| 0  | _now_   | Finalise revised architecture, assign owners, update GitHub board |
| 1  | +1 wk   | Python Scrapy spider enhancements for multi-domain crawl & JSON export |
| 2  | +2 wk   | Vector ingestion pipeline: `upload_to_vector_db.py` integration & bulk-upload endpoints |
| 3  | +3 wk   | C# embedding service refactoring: AzureOpenAIEmbeddingService & CosmosDbService |
| 4  | +4 wk   | Chat API (ASP.NET Core) improvements: rate limiting, sanitization & direct-match logic |
| 5  | +5 wk   | Front-end JS widget enhancements: dynamic config, typing indicators, error handling |
| 6  | +6 wk   | Pilot on staging: analytics, logging, privacy review, performance tuning |
_Parallel_: CI/CD, Docker Compose, stakeholder demos, GDPR audit.

---

## 3. Architecture
```text
Browser (JS Widget) → ASP.NET Core Chat API → Cosmos DB (vector store & metadata) ↔ Azure OpenAI
```
1. **JS Widget** (`src/web/js/chatbot.js`): Vanilla JS + Shadow DOM; fetches `/api/chat`, displays messages, handles multi-language configs.
2. **Chat API** (`ChatController.cs`): ASP.NET Core endpoint `/api/chat`, implements
   - CORS, JSON parsing, rate limiting (60 req/min per IP)  
   - Input sanitization & stop-word removal  
   - Query embedding via **AzureOpenAIEmbeddingService**  
   - Vector search in Cosmos DB via **CosmosDbService**  
   - Direct-match logic (stand/booth lookup, synonyms)  
   - Conversational memory (in-memory per IP)  
   - Azure OpenAI chat completion with system prompt and contextual events
3. **Embedding & Vector Store**:
   - **AzureOpenAIEmbeddingService**: generates embeddings for ingestion and queries  
   - **CosmosDbService**: upserts event docs with embeddings; supports similarity search
4. **LLM**: Azure OpenAI (`ChatCompletions`) with configurable deployment; fallback to alternative model via configuration

---

## 4. Data ingestion pipeline
1. **Scraping**: `src/python/scraper/spiders/event_site_spider.py` → JSON file with (`event_id`, `url`, `title`, `description`, `raw_text_content`, `booth_number`).
2. **Cleaning**: Optional `clean_json.py` to minify and normalize whitespace, remove non-ASCII.
3. **Bulk upload**: `upload_to_vector_db.py` (in `VectorEmbeddingService`) calls `/api/{container}/bulk-upload` to clear and upsert events.
4. **Embedding generation**: AzureOpenAIEmbeddingService produces embeddings; CosmosDbService persists vectors + metadata.
5. **Incremental updates**: run scraper + upload daily via GitHub Actions; use HTTP headers (ETag/Last-Modified) to skip unchanged pages.

---

## 5. Chat logic enhancements
1. **Hybrid retrieval**: vector search (Azure Cosmos) + direct keyword matching (booth/stand).  
2. **Context handling**: in-memory conversational memory & follow-up detection.  
3. **Sanitization**: remove stop-words, detect and normalize synonyms.  
4. **Rate limiting & logging**: per-IP limits, anonymized logs for analytics.  
5. **Fallback answers**: system prompt guidance + user feedback loop (thumbs up/down).

---

## 6. Front-end widget details
- **Tech**: Vanilla JS, Shadow DOM; bundle <30 KB gzipped.  
- **Config**: `data-website` attribute + optional selector for event (`ffd`, `artisan`, `abiss`).  
- **UX**: typing indicator, configurable welcome messages, error states.  
- **Branding**: CSS variables `--chat-primary`, `--chat-font`.  
- **i18n & accessibility**: detects `html[lang]`, ARIA roles, keyboard navigation.

---

## 7. Deployment & DevOps
- **Docker Compose**:
  - `chat-api` (ASP.NET Core)  
  - `scraper` (Python)  
  - `vector-ingestion` (Python)  
  - `cosmosdb-emulator` (dev) or Azure Cosmos
- **CI/CD**: GitHub Actions for lint, tests, builds, deploy to Azure (API) & static hosting.  
- **Observability**: Application Insights for .NET, Prometheus + Grafana for metrics.

---

## 8. Privacy & Compliance
- Mask personal data via sanitization regex.  
- Consent banner updates for functional cookies.  
- "Erase my data" endpoint support.

---

## 9. Essential Guidance & Must-Haves
* Comprehensive Coverage: ensure the scraper and ingestion pipeline include all event content (agenda, speakers, exhibitors, sponsors, logistics) with automated freshness checks and change detection.
* High-Quality Data: apply noise removal, text normalization, metadata tagging (category, date, location) and maintain a curated FAQ knowledge base for top user intents.
* Performance & Scalability: target <200 ms average response time, implement semantic and HTTP caching, and conduct load testing to support >500 concurrent users.
* UX & Accessibility: adopt mobile-first design, WCAG 2.1 AA compliance, keyboard navigation, ARIA roles, theme customization, and localized date/time formats.
* Security & Privacy: integrate anti-bot measures using free Cloudflare Turnstile (or Google reCAPTCHA v3) in the JS widget, with server-side token verification; optionally issue short-lived JWTs for session authentication (issued transparently by the gateway); enforce strict CORS policies, input sanitization to prevent XSS/SQLi, GDPR-compliant data handling, and regular security audits.
* Monitoring & Analytics: track query volumes, top intents, fallback rates, and user feedback (thumbs up/down), and expose dashboards via Grafana or Application Insights.
* Continuous Improvement: establish an active learning loop for retraining embeddings and re-ranking models, A/B test prompt templates and retrieval strategies, and maintain versioned vector data.
* Multi-language Support: detect page language, support multilingual embeddings or dynamic translation, and maintain separate context collections per language.
* Human Escalation & Fallback: detect low-confidence responses, provide a "contact support" CTA or live chat escalation, and integrate with ticketing systems.
* Documentation & Testing: maintain clear API and ingestion docs, write integration and end-to-end tests covering scraper → ingestion → API → widget.

---



