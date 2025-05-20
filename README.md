# Kortrijk Xpo Event Chatbot Project

## 1. Project Goal

To develop an intelligent chatbot that can answer user questions about events listed on the Kortrijk Xpo calendar (https://www.kortrijkxpo.com/kalender/). The chatbot should provide information about event details, descriptions, links to event pages, and where possible, information like pricing and dates by scraping the main Kortrijk Xpo site and relevant linked external event sites.

## 2. Current Status

The project consists of two main components: a web scraper and a chatbot application.

### 2.1. Web Scraper (`kortrijk_xpo/spiders/full_site_spider.py`)

*   **Crawling:**
    *   Starts at `https://www.kortrijkxpo.com/kalender/`.
    *   Follows links to individual event detail pages on the `kortrijkxpo.com` domain.
    *   Identifies and extracts links from `div.socialmedia_links` elements found on these event pages.
    *   Follows these external links to scrape primary external event sites.
    *   Performs a one-level deep dive on these primary external sites, looking for pages related to booking, tickets, or pricing (based on keywords in link text/hrefs).
*   **Data Extraction:** Extracts title, meta description, and raw text content from all scraped pages. `socialmedia_links` are also stored for Kortrijk Xpo event pages.
*   **Filtering:** Implements a `BLACKLISTED_DOMAINS` list to avoid crawling irrelevant sites (e.g., social media platforms, general support pages).
*   **Output:** Saves all scraped data into `full_site_data.json`. Each entry includes the URL, title, description, raw text content, and a `source_type` (e.g., `kortrijkxpo_site`, `primary_external_event_site`, `external_event_subpage`).
*   **Configuration:** Uses Scrapy, depth limit is currently 0 (effectively managed by specific link following logic), `ROBOTSTXT_OBEY` is `False` to ensure full crawl of intended pages.

### 2.2. Chatbot (`chatbot.py`, `app.py`)

*   **Core Technology:**
    *   Uses [LangChain](https://www.langchain.com/) framework.
    *   Powered by a local LLM (currently Llama 3) via [Ollama](https://ollama.ai/).
*   **Architecture:** Implements a Retrieval Augmented Generation (RAG) strategy.
    *   **Data Loading:** Loads the scraped event data from `full_site_data.json` at startup.
    *   **Keyword Extraction (`_extract_keywords_from_input`):** A basic keyword extraction mechanism processes the user's input to identify key terms. This involves lowercasing, removing common stop words, and simple multi-word term handling (e.g., "battle kart" -> "battlekart").
    *   **Event Retrieval (`get_relevant_events`):**
        *   Searches the loaded event data based on the extracted keywords.
        *   Implements a scoring system: matches in event `title` are weighted higher than `description`, which are higher than `raw_text_content`.
        *   Includes logic for keyword variations (e.g., "karting" also searches for "kart", "battlekart").
        *   Generates contextual snippets (`_get_contextual_snippet`) from `raw_text_content` if a keyword is found there, to provide more targeted information to the LLM.
        *   Returns a list of events, sorted by relevance score.
    *   **Contextual Prompting:**
        *   Constructs a focused context string containing details from the top N (currently 3) most relevant events found. This includes title, URL, description, social links, source type, and the generated `relevant_snippet`.
        *   This curated context, along with the user's original question, is passed to the LLM.
        *   The prompt guides the LLM to answer based *only* on the provided context.
*   **Execution:** Currently run as a command-line application via `python app.py` for testing and development.

## 3. Key Challenges & Current Focus

*   **Effective RAG Implementation:**
    *   **Large JSON Data (`full_site_data.json` ~700kB):** Efficiently retrieving the most relevant information from this large dataset to fit within LLM context window limits and provide accurate answers. The current keyword-based RAG is the primary strategy to manage this.
    *   **Robust Event Retrieval:** Continuously improving the `get_relevant_events` logic is critical. This includes:
        *   Accurately identifying events when user queries are ambiguous or use synonyms (e.g., "karting" vs. "BattleKart").
        *   Effectively finding and extracting specific details like pricing or dates when they are embedded within the `raw_text_content` of main or sub-pages. The snippet generation is a first step.
*   **Natural Language Understanding:**
    *   **Keyword Extraction Quality:** The current `_extract_keywords_from_input` method is basic. Improving its ability to discern user intent and extract meaningful keywords/entities is a priority.
*   **LLM Performance:**
    *   **Accuracy & Hallucination:** Ensuring the LLM strictly adheres to the provided context and accurately reports when information is not available, rather than guessing or hallucinating.
    *   **Response Quality:** Getting concise, relevant, and well-formatted answers from the LLM.
*   **Iterative Debugging:** Systematically identifying and fixing runtime errors and logical flaws in both the scraper and chatbot components.

## 4. To-Do / Future Enhancements

### 4.1. Core Chatbot & RAG Refinements

*   **Advanced Keyword/Entity Extraction:**
    *   Integrate NLP libraries like [spaCy](https://spacy.io/) for more sophisticated Named Entity Recognition (NER), part-of-speech tagging, and dependency parsing to better understand user queries and identify key terms.
    *   Develop more comprehensive synonym lists and semantic understanding for event types and features.
*   **Improved Retrieval Scoring:** Refine the scoring mechanism in `get_relevant_events` to better rank events based on query relevance and the specificity of matches.
*   **Optimized Snippet Generation:** Enhance `_get_contextual_snippet` to be more "intelligent" in how it extracts snippets, perhaps by looking for sentence boundaries or trying to summarize around keywords.
*   **Semantic Search (Vector Embeddings):**
    *   Explore using sentence embeddings (e.g., via Sentence Transformers) for the event data (especially titles, descriptions, and key parts of `raw_text_content`).
    *   Implement a vector similarity search to find relevant events based on semantic meaning rather than just keyword overlap. This could significantly improve retrieval for more nuanced queries. This would likely involve a vector database (e.g., FAISS, ChromaDB).
*   **LLM Prompt Engineering:** Continuously iterate on the system prompt to:
    *   Improve instruction following.
    *   Enhance the LLM's ability to synthesize information from multiple provided event snippets.
    *   Better handle cases where information is explicitly not found in the context.
*   **Handling Follow-up Questions:** Improve the chatbot's ability to understand context from previous turns more effectively (e.g., if a user asks "What about the price?" after an event has been discussed). LangChain's memory should help, but prompt structure is key.

### 4.2. Scraper Enhancements

*   **Targeted Data Extraction for External Sites:** If common HTML structures or APIs are identified on frequently linked external event sites (especially for pricing/booking), implement more targeted scraping logic for these instead of relying solely on `raw_text_content`.
*   **Incremental Scraping/Data Updates:** Develop a strategy for updating `full_site_data.json` (e.g., periodic re-scraping, checking for changes) rather than always starting from scratch (important for a live application).
*   **Enhanced Error Handling & Resilience:** Improve the scraper's ability to handle network issues, unexpected page structures, and timeouts more gracefully.
*   **Dynamic `DEPTH_LIMIT`:** For the primary external site, consider a slightly deeper crawl (e.g., `DEPTH_LIMIT` of 1 or 2 from the initial external link) if crucial information is often nested one or two clicks away, beyond the current explicit booking/price link search.

### 4.3. Data Processing & Management

*   **Data Cleaning:** Implement more rigorous cleaning of `raw_text_content` (e.g., removing boilerplate, excessive whitespace, navigation menus) to improve the signal-to-noise ratio for both retrieval and LLM context.
*   **Structured Data Extraction (Post-Scraping):** Consider running a post-processing step on `full_site_data.json` to try and extract more structured information (like dates, times, prices if patterns exist) from the `raw_text_content` using regex or simple parsers, storing these as new fields.

### 4.4. UI & Integration (Long-Term)

*   **Web Interface:** Develop a user-friendly web interface for the chatbot (e.g., using Flask/FastAPI for the backend and a simple HTML/JS frontend).
*   **Website Integration:** The ultimate goal is to integrate this chatbot as a feature within the `https://www.kortrijkxpo.com/kalender/` page.
*   **Testing Environment:** For the foreseeable future, development and testing of the agent (scraping and chatbot logic) will continue using Python scripts and command-line interaction before focusing on web UI integration.

### 4.5. Evaluation & Monitoring

*   **Test Suite:** Develop a set of standardized questions and expected outcomes to objectively evaluate the chatbot's performance and track improvements over time.
*   **Logging & Analytics:** Implement more detailed logging for chatbot interactions to identify common failure points or areas for improvement.

## 5. Development Environment

*   **Language:** Python
*   **Package Management:** Conda (environment name: `kortrijk-xpo`)
*   **Web Scraping:** Scrapy
*   **Chatbot Core:** LangChain
*   **LLM Provider:** Ollama (running Llama 3 locally)
*   **Key Data File:** `full_site_data.json` (output from scraper, input to chatbot)

This README aims to be a live document, updated as the project progresses.

## 6. Setup and Running the Project

### 6.1. Prerequisites

*   **Python:** Version 3.9 or higher recommended.
*   **Ollama:** Ensure Ollama is installed and running on your system. You can find installation instructions at [https://ollama.ai/](https://ollama.ai/).
*   **Llama 3 Model:** You'll need to have the Llama 3 model (or your preferred compatible model) pulled via Ollama.
    ```bash
    ollama pull llama3
    ```
    (If you use a different model, make sure to update it in `chatbot.py` where `self.llm = Ollama(model="llama3")` is set).

### 6.2. Environment Setup & Dependencies

It's highly recommended to use a virtual environment to manage project dependencies.

1.  **Create a Virtual Environment (using `venv`):**
    Open your terminal in the project's root directory and run:
    ```bash
    python3 -m venv .venv 
    ```
    (Replace `.venv` with your preferred environment name if desired).

2.  **Activate the Virtual Environment:**
    *   On macOS and Linux:
        ```bash
        source .venv/bin/activate
        ```
    *   On Windows:
        ```bash
        .\.venv\Scripts\activate
        ```

3.  **Install Dependencies:**
    With the virtual environment activated, install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```

    *(Side Note for Warre: Warre uses Conda for environment management (environment name: `kortrijk-xpo`). If you're Warre or prefer Conda, you likely already have this environment set up with these dependencies.)*

### 6.3. Running the Scraper

Before running the chatbot for the first time, or whenever you need to refresh the event data, run the Scrapy spider:

1.  **Ensure Dependencies are Installed:** Make sure your virtual environment is activated and dependencies from `requirements.txt` are installed.
2.  **Run the spider:**
    From the project's root directory (`Probeersel`), execute:
    ```bash
    scrapy crawl full_site_spider
    ```
    This will create/update the `full_site_data.json` file in the project root.

### 6.4. Running the Chatbot Application

1.  **Ensure Ollama is Running:**
    Open a separate terminal window and start the Ollama service if it's not already running:
    ```bash
    ollama serve
    ```
    Keep this terminal window open while the chatbot is in use. This is crucial for the chatbot to connect to the LLM.

2.  **Ensure Event Data Exists:** Make sure you have run the scraper at least once (`scrapy crawl full_site_spider`) so that `full_site_data.json` exists in the project root.

3.  **Run the Chatbot App:**
    In your project's root directory (where `app.py` and `chatbot.py` are located), with your virtual environment activated, run:
    ```bash
    python app.py
    ```
    This will start the command-line interface for the chatbot. You can then interact with it by typing your questions. If successful, you should see a "Welcome..." message. If there are issues loading data or connecting to Ollama, error messages will be printed in the console. 