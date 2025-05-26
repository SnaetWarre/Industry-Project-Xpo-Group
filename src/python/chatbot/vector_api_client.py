import requests
import json
from typing import List, Dict, Optional
import logging

class VectorApiClient:
    def __init__(self, base_url: str = "http://localhost:5000"):
        """
        Initialize the Vector API client.
        
        Args:
            base_url: Base URL of the C# Vector Embedding Service
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.logger = logging.getLogger(__name__)

    def search_events(self, query: str, top_k: int = 5, threshold: float = 0.7) -> List[Dict]:
        """
        Search for events using vector similarity.
        
        Args:
            query: Search query text
            top_k: Number of top results to return
            threshold: Similarity threshold (0.0 to 1.0)
            
        Returns:
            List of event documents
        """
        try:
            url = f"{self.base_url}/api/events/search"
            payload = {
                "query": query,
                "topK": top_k,
                "threshold": threshold
            }
            
            self.logger.info(f"Searching events with query: '{query}'")
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            
            events = response.json()
            self.logger.info(f"Found {len(events)} events")
            return events
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error searching events: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Unexpected error searching events: {e}")
            return []

    def get_embedding(self, text: str) -> Optional[List[float]]:
        """
        Get vector embedding for text.
        
        Args:
            text: Text to embed
            
        Returns:
            Vector embedding as list of floats, or None if error
        """
        try:
            url = f"{self.base_url}/api/events/embedding"
            payload = {"text": text}
            
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            
            embedding = response.json()
            return embedding
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error getting embedding: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Unexpected error getting embedding: {e}")
            return None

    def bulk_upload_events(self, events: List[Dict]) -> Dict:
        """
        Upload events in bulk to the vector database.
        
        Args:
            events: List of event dictionaries from scraper
            
        Returns:
            Upload result summary
        """
        try:
            url = f"{self.base_url}/api/events/bulk-upload"
            payload = {"events": events}
            
            self.logger.info(f"Uploading {len(events)} events to vector database")
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            
            result = response.json()
            self.logger.info(f"Upload completed: {result.get('successfulUpserts', 0)}/{result.get('totalEvents', 0)} successful")
            return result
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error uploading events: {e}")
            return {"error": str(e)}
        except Exception as e:
            self.logger.error(f"Unexpected error uploading events: {e}")
            return {"error": str(e)}

    def get_event_count(self) -> int:
        """
        Get total number of events in the database.
        
        Returns:
            Number of events
        """
        try:
            url = f"{self.base_url}/api/events/count"
            response = self.session.get(url)
            response.raise_for_status()
            
            result = response.json()
            return result.get("count", 0)
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error getting event count: {e}")
            return 0
        except Exception as e:
            self.logger.error(f"Unexpected error getting event count: {e}")
            return 0

    def get_all_events(self) -> List[Dict]:
        """
        Get all events from the database.
        
        Returns:
            List of all event documents
        """
        try:
            url = f"{self.base_url}/api/events"
            response = self.session.get(url)
            response.raise_for_status()
            
            events = response.json()
            return events
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error getting all events: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Unexpected error getting all events: {e}")
            return []

    def health_check(self) -> bool:
        """
        Check if the API service is available.
        
        Returns:
            True if service is available, False otherwise
        """
        try:
            url = f"{self.base_url}/api/events/count"
            response = self.session.get(url, timeout=5)
            return response.status_code == 200
        except:
            return False

    def upload_scraped_data(self, json_file_path: str) -> Dict:
        """
        Upload scraped data from JSON file to vector database.
        
        Args:
            json_file_path: Path to JSON file with scraped events
            
        Returns:
            Upload result summary
        """
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                events = json.load(f)
            
            if not isinstance(events, list):
                raise ValueError("JSON file must contain a list of events")
            
            return self.bulk_upload_events(events)
            
        except FileNotFoundError:
            error_msg = f"File not found: {json_file_path}"
            self.logger.error(error_msg)
            return {"error": error_msg}
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON in file {json_file_path}: {e}"
            self.logger.error(error_msg)
            return {"error": error_msg}
        except Exception as e:
            error_msg = f"Error uploading scraped data: {e}"
            self.logger.error(error_msg)
            return {"error": error_msg} 