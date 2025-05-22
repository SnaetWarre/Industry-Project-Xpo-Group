# Stepplan: Integrating Vector Embeddings and Database into Chatbot

This document outlines the steps to modify the existing chatbot application to use vector embeddings stored in a database for retrieving relevant event information.

## Phase 1: Setup and Data Preparation

### Step 1: Choose and Set Up a Vector Database
   - **Action:** Select a vector database. Options include:
     - **Local/Self-Hosted:** ChromaDB, FAISS (with a wrapper), Weaviate (can be run locally via Docker).
     - **Cloud-Hosted:** Pinecone, Weaviate Cloud Services, Zilliz Cloud.
   - **Considerations:** Ease of setup, scalability, cost, Python client library availability. For development, ChromaDB is often a good starting point due to its simplicity.
   - **Task:** Install the chosen database and its Python client library.
     ```bash
     # Example for ChromaDB
     pip install chromadb
     ```
   - **Task:** Initialize the database/collection where embeddings will be stored.

### Step 2: Review `clean_json.py` Output
   - **Action:** Ensure the `output.clean.json` (or the file produced by `clean_json.py`) is well-structured and contains all necessary fields for each event (e.g., `title`, `description`, `raw_text_content`, `url`, `stand_numbers`, `socialmedia_links`).
   - **Task:** Verify that text fields are clean enough for effective embedding (e.g., excessive noise or irrelevant boilerplate removed). The current `clean_json.py` script's collapsing and non-ASCII removal options are good.

## Phase 2: Embedding Generation and Storage

### Step 3: Create an Embedding Script (`embed_data.py`)
   - **Purpose:** This script will read the cleaned JSON data, generate embeddings for each event, and store them in the vector database.
   - **Tasks:**
     1. **Import Libraries:** `json`, the chosen vector database client, and an embedding model library (e.g., `sentence-transformers`).
        ```bash
        pip install sentence-transformers
        ```
     2. **Load Embedding Model:** Choose a pre-trained model. `all-MiniLM-L6-v2` is a good general-purpose starting model.
        ```python
        # In embed_data.py
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('all-MiniLM-L6-v2')
        ```
     3. **Connect to Vector Database:** Initialize the client and connect to your database/collection.
     4. **Load Cleaned JSON Data:** Read the `output.clean.json` file.
     5. **Process Each Event:**
        - For each event:
          - **Concatenate Text Fields:** Create a single string that represents the event's content. This string will be embedded. Include fields like `title`, `description`, and a significant portion of `raw_text_content`.
            ```python
            # Example:
            text_to_embed = f"Title: {event.get('title', '')}\nDescription: {event.get('description', '')}\nContent: {event.get('raw_text_content', '')[:2000]}" # Truncate raw_text if too long
            ```
          - **Generate Embedding:**
            ```python
            embedding = model.encode(text_to_embed).tolist() # Convert to list for JSON compatibility with some DBs
            ```
          - **Prepare Metadata:** The metadata should include the full event data or at least an ID to retrieve it, plus any fields needed for filtering (e.g., `url`, `title`, `stand_numbers`).
          - **Store in Vector Database:** Add the embedding and its associated metadata to the database. Most vector databases allow storing a document/ID, the vector, and a metadata payload.
            ```python
            # Example for ChromaDB (conceptual)
            # collection.add(
            #     embeddings=[embedding],
            #     metadatas=[event_metadata], # The full event dict or relevant parts
            #     ids=[event_id] # A unique ID for each event
            # )
            ```
     6. **Run the Script:** Execute `python embed_data.py` after the scraper and `clean_json.py` have run.

## Phase 3: Modify `chatbot.py`

### Step 4: Update `EventChatbot.__init__`
   - **Remove `self.events` loading:** The chatbot will no longer load `full_site_data.json` (or `args.data`) into an in-memory list.
   - **Initialize Vector Database Client:** Add code to connect to the vector database.
   - **Load Embedding Model:** Initialize the same `SentenceTransformer` model used in `embed_data.py`.
     ```python
     # In chatbot.py
     # self.events: List[Dict] = [] # REMOVE THIS
     # ... remove file loading logic for self.events ...

     from sentence_transformers import SentenceTransformer # ADD
     self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2') # ADD

     # Initialize vector DB client (e.g., ChromaDB)
     # self.vector_db_collection = ... # ADD
     ```
   - **`_add_stand_numbers_to_events`:** This method processes `self.events`. Since `self.events` will be removed, ensure stand numbers are processed *before* embedding (i.e., included in the data that `embed_data.py` processes and stores in the vector DB). If `output.json` from the spider already contains this, or if `clean_json.py` can handle it, that's ideal. Otherwise, this logic might need to be integrated into the data preparation pipeline *before* `embed_data.py`.

### Step 5: Modify `EventChatbot.chat` Method
   1. **Remove `self.get_relevant_events` call:** This will be replaced by a vector DB query.
   2. **Generate Query Embedding:**
      ```python
      user_query_embedding = self.embedding_model.encode(user_input).tolist()
      ```
   3. **Query Vector Database:**
      - Use the `user_query_embedding` to search the vector database for the top N most similar events.
        ```python
        # Example for ChromaDB (conceptual)
        # results = self.vector_db_collection.query(
        #     query_embeddings=[user_query_embedding],
        #     n_results=5 # Or some other N
        # )
        # relevant_events_data = results['metadatas'][0] # Assuming metadatas contain the event dicts
        ```
      - `relevant_events_data` will now be a list of event dictionaries retrieved from the database.
   4. **Adapt Context Building:** The existing logic for formatting `events_context_str` using `relevant_events_data` should largely remain the same, as it expects a list of event dictionaries.
   5. **Keyword Extraction (`_extract_keywords_from_input`):**
      - This can still be useful for `self.user_preferences`.
      - It's no longer the primary mechanism for event retrieval. It could potentially be used for hybrid search (keyword + vector) if your chosen DB supports it, or as a secondary filtering step, but start with pure vector search.

### Step 6: Remove or Refactor `EventChatbot._get_contextual_snippet` and `EventChatbot.get_relevant_events`
   - `get_relevant_events`: This method, which performs keyword-based search on `self.events`, will be entirely replaced by the vector database query. It can be removed.
   - `_get_contextual_snippet`:
     - If you store fairly complete `raw_text_content` in the vector database's metadata, you could still generate snippets from the *retrieved* data.
     - Alternatively, for simplicity, you might initially rely on the `description` and `title` fields retrieved from the DB for the LLM's context. Generating snippets on-the-fly from potentially large `raw_text_content` retrieved from the DB adds complexity.
     - Consider if the "relevant_snippet" generated by `get_relevant_events` should be pre-generated and stored as part of the metadata in the vector DB during the `embed_data.py` step. This would be more efficient.

## Phase 4: Adjust Supporting Scripts

### Step 7: Review `kortrijk_xpo/spiders/event_site_spider.py`
   - **Action:** Ensure the spider extracts all necessary data fields that you want to store in the vector database and make searchable or display to the user. This includes `title`, `description`, `raw_text_content`, `url`, `socialmedia_links`, and any other relevant details like `booth_number`.
   - **Current State:** The spider seems to be collecting these fields. `booth_number` is extracted; ensure `stand_numbers` logic (currently in `chatbot.py`) is correctly handled (see Step 4).

### Step 8: `spider_closed` method in `event_site_spider.py`
   - **Current State:** This method calls `clean_json.py`.
   - **Modification:** After `clean_json.py` runs successfully, you might want to automatically trigger `embed_data.py`. This could be done by adding another `subprocess.run` call or by making it a separate manual step in your data pipeline.
     ```python
     # In spider_closed, after successful cleaning:
     # embed_script_path = Path(__file__).resolve().parent.parent.parent / "embed_data.py"
     # cleaned_output_file = output_file_path.with_suffix('.clean.json')
     # if embed_script_path.exists() and cleaned_output_file.exists():
     #     cmd_embed = ["python", str(embed_script_path), str(cleaned_output_file)]
     #     # ... run subprocess for embedding ...
     ```

## Phase 5: Testing and Iteration

### Step 9: Testing
   - **Full Pipeline Test:** Run the scraper, then `clean_json.py`, then `embed_data.py`.
   - **Chatbot Interaction:** Test the chatbot with various queries.
     - Check if relevant events are retrieved.
     - Evaluate the quality of responses.
     - Test edge cases (no matching events, ambiguous queries).

### Step 10: Iteration and Tuning
   - **Embedding Strategy:**
     - Experiment with the content used for generating embeddings (e.g., which fields to concatenate, how much text from `raw_text_content`).
     - Try different pre-trained `sentence-transformer` models if results are not satisfactory.
   - **Number of Results (N):** Tune the `n_results` parameter in the vector database query to balance context length and relevance.
   - **Prompt Engineering:** You might need to adjust the prompt in `chatbot.py` slightly to reflect that the context is now coming from a semantic search over a database.
   - **Hybrid Search (Optional Advanced):** If pure vector search isn't always perfect, explore if your vector DB supports hybrid search (combining vector similarity with keyword matching).

This plan provides a comprehensive roadmap. Start with the core changes and gradually refine the system. 