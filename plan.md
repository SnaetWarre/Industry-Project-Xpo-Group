# AI Chatbot Integration Plan for Kortrijk Xpo & Event Microsites

**Document version:** 2025-05-21  
**Authors:** MCT Industry Project Student Group (Howest)  
**Scope:** Flanders Flooring Days, Artisan-Xpo, Abiss Summit & future Xpo-hosted event sites

---

## 1. Objectives
1. Offer visitors an on-page virtual assistant that answers practical and in-depth questions about each event (dates, tickets, programme, venue logistics, etc.).
2. Reduce pressure on support teams by deflecting repetitive questions.
3. Re-use our existing RAG-based Python codebase, but expose it as a web service and embed it across multiple sites with minimal effort.

---

## 2. High-level roadmap
| Phase | Target week | Deliverables |
|-------|-------------|--------------|
| 0 | _now_ | Finalise this plan, assign owners, create GitHub project board |
| 1 | +1 wk | Extend Scrapy spider(s) to crawl Flanders Flooring Days, Artisan-Xpo, Abiss Summit (primary domain only, depth ≤ 1) |
| 2 | +2 wk | Refactor existing RAG logic into reusable **`chat_service/`** (FastAPI) with `/chat` endpoint |
| 3 | +3 wk | Introduce vector search (ChromaDB/FAISS) & embeddings (sentence-transformers) for better retrieval |
| 4 | +4 wk | Build lightweight JS widget (floating button ➜ chat panel) + hand-off style variables (colour, logo) |
| 5 | +5 wk | Pilot on staging sub-domains of the three event sites |
| 6 | +6 wk | Measure, iterate (logging, analytics, fallback answers), prepare production roll-out |

_Parallel tracks_: security/GDPR review, CI/CD & Docker setup, stakeholder demos every sprint.

---

## 3. Architecture
```
Browser          ┌──────────────┐    REST      ┌───────────────┐   Local          ┌──────────┐
 Chat widget  ⇄  │  FastAPI     │ ⇄  /chat  ⇄  │  RAG Service  │ ⇄  embeddings ⇄  │ Ollama │
(on event site)   │  (Nginx)     │              │  (Python)     │    (Chroma)      │ Llama3 │
                 └──────────────┘              └───────────────┘                  └──────────┘
```
Key points:
1. **Widget**: one minified JS file loaded via `<script src="https://xpo.ai/chat.js" data-event="ffd">` that injects a floating icon. On open, it POSTs user text + `event_id` & (optionally) current page URL to `/chat`.
2. **FastAPI gateway**: lightweight layer providing CORS, rate-limiting & authentication (public sites ➜ use reCAPTCHA v3 + per-origin API keys).
3. **RAG Service**: wraps existing `chatbot.py` logic, but replaces JSON scan with vector search. Accepts `event_id` to scope retrieval.
4. **Embeddings store**: Chroma or FAISS, one collection per event; populated by scraper pipeline.
5. **LLM**: continue with Ollama (Llama 3) running on same server or GPU node.

---

## 4. Data ingestion pipeline
1. **Spider layout**
   * `kortrijk_xpo/spiders/event_site_spider.py` → generic; takes `start_urls` list.
   * Domain rules & CSS selectors for each site in `spider_config.yaml`.
2. **Output format**
   ```json
   {
     "event_id": "ffd",
     "url": "https://www.flandersflooringdays.com/en/plan-your-visit/",
     "title": "Plan your visit – Practical information",
     "text": "…cleaned visible text…"
   }
   ```
3. **Post-processing**
   * Remove navigation/footer noise with readability-lxml.
   * Split into 1-3 kB chunks with overlap; generate embeddings via `sentence-transformers/all-MiniLM-L6-v2`.
   * Upsert into Chroma (`collection_name = event_id`).
4. **Incremental updates**: run daily GitHub Action; spider uses `ETag`/`Last-Modified` headers to skip unchanged pages.

---

## 5. Chat logic enhancements
1. **Hybrid retrieval**: keyword filter (current code) + top-k embedding similarity.
2. **Context window handling**: auto-summarise long snippets to stay ≤ 8 k tokens.
3. **Page-aware biasing**: if current page URL is provided, boost documents from same URL path.
4. **Temperature scheduling**: lower when answerable, higher when fallback ("I don't have that info").
5. **Logging**: store anonymised conversation, retrieval meta & response latency in Postgres for analytics.

---

## 6. Front-end widget details
* **Tech:** Vanilla JS + shadow DOM, no framework to keep bundle < 30 kB gzipped.
* **Features:**
  * Quick replies (chips) for top FAQ; updated via `/faq?event_id=` endpoint.
  * "Email me this answer" CTA (calls SendGrid backend).
  * Brandable via CSS variables `--chat-primary`, `--chat-font`.
* **Accessibility:** ARIA roles, focus trap, keyboard navigation.
* **i18n:** auto-detect site language (`html[lang]`) ➜ pass to backend for prompt language.

---

## 7. Deployment & DevOps
* **Docker Compose** stacks:
  * `gateway` (uvicorn-gunicorn-fastapi)
  * `rag_service` (python)
  * `ollama` (official image)
  * `chromadb`
* **Environments**: `dev` (localhost), `staging` (Azure VM), `prod` (KXpo on-prem or AWS).
* **CI/CD**: GitHub Actions — lint, tests, image build, deploy through SSH or Azure Web Apps.
* **Observability**: Prometheus exporter for FastAPI; Grafana dashboard.

---

## 8. Privacy & Compliance
* Only store minimal, anonymised chat logs; mask personal data via regex patterns.
* Show cookie-consent banner update to include chatbot (functional cookies).
* Provide "Erase my data" endpoint.

---



