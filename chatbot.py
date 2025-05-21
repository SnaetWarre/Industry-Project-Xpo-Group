from langchain_community.llms import Ollama
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
import json
import re # For more advanced keyword searching
from typing import List, Dict, Optional
import argparse, os

class EventChatbot:
    def __init__(self, data_path: str = "full_site_data.json"):
        # Initialize Ollama with DeepSeek model
        self.data_path = data_path # Store the path for later logic
        self.llm = Ollama(model="llama3")
        
        # Load events
        self.events: List[Dict] = []
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                self.events = json.load(f)
            if not self.events:
                 print(f"Warning: '{data_path}' was loaded but is empty or not valid JSON list.")
                 self.events = []
        except FileNotFoundError:
            print(f"Error: '{data_path}' not found. Chatbot will not have event data.")
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from '{data_path}': {e}. Chatbot will not have event data.")
        except Exception as e:
            print(f"An unexpected error occurred loading '{data_path}': {e}")
        
        # Enrich events with stand numbers parsed from raw_text_content (if any)
        self._add_stand_numbers_to_events()

        # Create conversation memory
        self.memory = ConversationBufferMemory()
        
        # The {input} to the prompt will now be a formatted string containing both the event context and the user's actual question.
        template = """You are a helpful assistant that recommends events from Kortrijk Xpo.
        The user's query is preceded by relevant event information if any was found.
        Use ONLY the provided event information to answer the user's question about event titles, descriptions, URLs, social media links, and other details like pricing or dates if present.
        If the user asks for a link, provide the 'URL' or 'Social Links' for the relevant event if available in the provided event information.
        If specific information (like ticket prices or exact dates) is not present in the provided event information, clearly state that. Do not make up information.
        If no relevant event information is provided, inform the user that no matching events were found based on their query.

        Current conversation:
        {history}

        Human's Query (possibly with preceding event context):
        {input}
        
        Assistant:"""
        
        prompt = PromptTemplate(
            input_variables=["history", "input"], # events_context is now part of 'input'
            template=template
        )
        
        # Initialize conversation chain once here
        self.conversation = ConversationChain(
            llm=self.llm,
            memory=self.memory,
            prompt=prompt,
            verbose=True # Good for debugging prompt formatting
        )
        
        # Store user preferences
        self.user_preferences = {
            "interests": [],
        }

    def _extract_keywords_from_input(self, user_input: str) -> List[str]:
        # Simple keyword extraction: lowercase, split, and remove common words
        # This can be significantly improved with NLP libraries (e.g., spaCy for entity recognition)
        user_input_lower = user_input.lower()
        words = re.findall(r'\b\w+\b', user_input_lower)
        
        # Define a list of common stop words relevant to the queries
        stop_words = {"i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
                      "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", 
                      "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", 
                      "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", 
                      "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", 
                      "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", 
                      "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", 
                      "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", 
                      "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", 
                      "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", 
                      "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "tell", "me", "about",
                      "like", "events", "event", "find", "show", "what's", "whats", "looking", "interested",
                      "hey", "hi", "hello", "there"}

        keywords = [word for word in words if word not in stop_words and len(word) > 2] # Basic filtering
        
        # Specific handling for multi-word terms if needed, e.g., "battle kart"
        if "battle" in keywords and "kart" in keywords:
            keywords.append("battlekart")
            keywords = [k for k in keywords if k not in ["battle", "kart"]]


        print(f"[DEBUG _extract_keywords_from_input] Extracted: {keywords} from '{user_input}'")
        return list(set(keywords)) # Return unique keywords

    def _get_contextual_snippet(self, text: str, keyword: str, window_size: int = 1000) -> Optional[str]:
        """Extracts a snippet of text around the first occurrence of a keyword."""
        try:
            text_lower = text.lower()
            keyword_lower = keyword.lower()
            
            match_idx = text_lower.find(keyword_lower)
            if match_idx == -1:
                return None

            start_idx = max(0, match_idx - window_size // 2)
            end_idx = min(len(text), match_idx + len(keyword_lower) + window_size // 2)
            
            snippet = text[start_idx:end_idx]
            
            # Add ellipses if snippet doesn't start/end at text boundaries
            prefix = "..." if start_idx > 0 else ""
            suffix = "..." if end_idx < len(text) else ""
            
            return f"{prefix}{snippet}{suffix}"
        except Exception as e:
            print(f"[ERROR _get_contextual_snippet] Error processing text for keyword '{keyword}': {e}")
            return text[:window_size] + "..." # Fallback

    def get_relevant_events(self, user_input: str, extracted_keywords: List[str]) -> List[Dict]:
        if not self.events:
            print("[DEBUG get_relevant_events] No events loaded to search from.")
            return []

        # If no keywords and we are using a specific event file (not the full dump)
        # then assume all content in that file is relevant for a generic query.
        if not extracted_keywords and self.data_path != "full_site_data.json":
            print(f"[DEBUG get_relevant_events] No specific keywords, using all {len(self.events)} items from {self.data_path} as context.")
            return self.events # Return all loaded events for the specific event file
        elif not extracted_keywords:
            print("[DEBUG get_relevant_events] No keywords extracted, cannot find relevant events effectively.")
            # Optionally, return a few generic events or an empty list
            return self.events[:3] # Return first 3 as a sample if no keywords found

        print(f"[DEBUG get_relevant_events] Searching with keywords: {extracted_keywords}")
        
        scored_events = []

        for i, event in enumerate(self.events):
            score = 0
            matching_details = [] # To store info about what matched

            title = event.get('title', '').lower()
            description = event.get('description', '').lower()
            raw_text = event.get('raw_text_content', '').lower() # Search in lowercase raw_text
            
            event_text_for_snippet = event.get('raw_text_content', '') # Original case for snippet

            matched_raw_text_keywords = []

            for kw in extracted_keywords:
                kw_lower = kw.lower()
                # Add variations for karting
                search_terms_for_kw = [kw_lower]
                if kw_lower == "karting":
                    search_terms_for_kw.extend(["kart", "karts", "battlekart"])
                elif "kart" in kw_lower: # e.g. battlekart
                     search_terms_for_kw.extend(["kart", "karten"])


                for term in search_terms_for_kw:
                    if term in title:
                        score += 5  # Higher score for title match
                        matching_details.append(f"title_match_on:'{term}'")
                    if term in description:
                        score += 3
                        matching_details.append(f"desc_match_on:'{term}'")
                    if term in raw_text:
                        score += 1 # Lower score for raw_text, but still counts
                        matching_details.append(f"raw_text_match_on:'{term}'")
                        if term not in matched_raw_text_keywords:
                             matched_raw_text_keywords.append(term)
            
            if score > 0:
                # Prepare a copy of the event to add processed snippets
                processed_event = event.copy()
                processed_event['_score'] = score
                processed_event['_matching_details'] = matching_details
                
                # If there was a match in raw_text, try to generate a relevant snippet
                if matched_raw_text_keywords:
                    all_snippets_for_event = set() # Use a set to store unique snippets
                    for snippet_keyword in matched_raw_text_keywords:
                        # _get_contextual_snippet is called for each keyword found in raw_text.
                        # It will find the first occurrence of *that specific* snippet_keyword.
                        snippet = self._get_contextual_snippet(event_text_for_snippet, snippet_keyword)
                        if snippet:
                            all_snippets_for_event.add(snippet)
                    
                    if all_snippets_for_event:
                        # Join unique snippets, sorted for some deterministic order.
                        processed_event['relevant_snippet'] = " ...\n\n... ".join(sorted(list(all_snippets_for_event)))
                
                scored_events.append(processed_event)

        # Sort events by score in descending order
        sorted_events = sorted(scored_events, key=lambda x: x['_score'], reverse=True)
        
        print(f"[DEBUG get_relevant_events] Found {len(sorted_events)} potentially relevant events. Top scores: {[e['_score'] for e in sorted_events[:5]]}")
        return sorted_events

    def chat(self, user_input: str) -> str:
        """Process user input and return response"""
        print(f"[DEBUG chat] Received user_input: '{user_input}'")
        
        keywords = self._extract_keywords_from_input(user_input)
        
        # Update user preferences (simple list for now)
        for kw in keywords:
            if kw not in self.user_preferences["interests"]:
                self.user_preferences["interests"].append(kw)
        print(f"[DEBUG chat] Updated user_preferences['interests']: {self.user_preferences['interests']}")

        relevant_events_data = self.get_relevant_events(user_input, keywords)
        
        num_events_to_show_in_context = 3 # Limit context to top N events
        
        events_context_parts = []
        if not relevant_events_data:
            events_context_str = "No specific events found matching your query in the available data."
            print("[DEBUG chat] No relevant events found to build context.")
        else:
            for event in relevant_events_data[:num_events_to_show_in_context]:
                title = event.get('title', 'N/A')
                url = event.get('url', 'N/A')
                description = event.get('description', 'N/A')
                social_links_list = event.get('socialmedia_links', [])
                social_links = ', '.join(social_links_list) if social_links_list else 'N/A'
                source_type = event.get('source_type', 'unknown')
                stand_numbers_list = event.get('stand_numbers', [])
                stand_numbers = ', '.join(stand_numbers_list) if stand_numbers_list else 'N/A'
                snippet = event.get('relevant_snippet', '') # Get pre-generated snippet

                event_detail = f"Event Title: {title}\nURL: {url}\nDescription: {description}\nStand Number(s): {stand_numbers}\nSocial Links: {social_links}\nSource Type: {source_type}"
                if snippet:
                    event_detail += f"\nRelevant Snippet from Content: {snippet}"
                
                events_context_parts.append(event_detail)
            
            events_context_str = "\n\n---\n\n".join(events_context_parts)
            
            if len(relevant_events_data) > num_events_to_show_in_context:
                # Ensure this f-string is correctly formatted
                note_str = f"Note: There are {len(relevant_events_data) - num_events_to_show_in_context} more potentially matching events. You can ask for more details or refine your search."
                events_context_str += f"\n\n---\n\n{note_str}"

        print(f"[DEBUG chat] events_context_str being sent to LLM (first 500 chars):\n{events_context_str[:500]}...")

        # Construct the enhanced input for the LLM
        enhanced_input = f"""Relevant Event Information:
{events_context_str}

---
User's Question: {user_input}"""

        print(f"[DEBUG chat] enhanced_input being sent to predict (first 500 chars):\n{enhanced_input[:500]}...")

        try:
            # Pass the combined context and question as the single 'input' to the chain
            response = self.conversation.predict(input=enhanced_input)
        except Exception as e:
            print(f"Error during LLM prediction: {e}")
            response = "I encountered an issue trying to process that. Could you try rephrasing?"

        return response

    # ------------------------------------------------------------------
    # Helper: Extract stand numbers
    # ------------------------------------------------------------------
    def _parse_stand_numbers(self, text: str) -> List[str]:
        """Return a list of stand numbers (e.g. '142', 'A01') found in the text."""
        pattern = re.compile(r"\bstand\s*[:\-]?\s*([A-Za-z0-9]{1,5})\b", re.IGNORECASE)
        raw_matches = pattern.findall(text)

        # Keep only items that contain at least one digit (to drop words like 'enbouwer')
        cleaned = [m for m in raw_matches if any(ch.isdigit() for ch in m)]
        return cleaned

    def _add_stand_numbers_to_events(self):
        """Iterate over loaded events and add a 'stand_numbers' field if we can parse it."""
        for evt in self.events:
            if 'stand_numbers' in evt:
                continue  # already processed

            raw_text = evt.get('raw_text_content', '')
            if not raw_text:
                continue

            stands = self._parse_stand_numbers(raw_text)
            if stands:
                # Deduplicate while preserving order
                seen = set()
                unique_stands = []
                for s in stands:
                    if s not in seen:
                        unique_stands.append(s)
                        seen.add(s)
                evt['stand_numbers'] = unique_stands

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kortrijk Xpo Event Chatbot (local dev mode)")
    parser.add_argument("--data", default="full_site_data.json", help="Path to JSON data produced by the scraper")
    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(f"Warning: data file '{args.data}' does not exist yet. Make sure to run a scraper first.")

    chatbot = EventChatbot(data_path=args.data)
    if not chatbot.events: # Check if events list is empty after __init__
        print(f"Chatbot cannot start effectively as no event data was loaded. Please check '{args.data}'.")
    else:
        print("Welcome to the Kortrijk Xpo Event Assistant! Type 'quit' to exit.")
        while True:
            user_input = input("\nYou: ")
            if user_input.lower() == 'quit':
                break
            
            response = chatbot.chat(user_input)
            print(f"\nAssistant: {response}") 