import requests
import json
from typing import List, Dict, Optional
import logging
import time

class VectorApiClient:
    def __init__(self, base_url: str = "http://localhost:5000", default_container: str = "ffd"):
        """
        Initialize the Vector API client.
        
        Args:
            base_url: Base URL of the C# Vector Embedding Service
            default_container: Default container name
        """
        self.base_url = base_url.rstrip('/')
        self.default_container = default_container
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.logger = logging.getLogger(__name__)

    def search_events(self, query: str, top_k: int = 5, threshold: float = 0.7, container: Optional[str] = None) -> List[Dict]:
        """
        Search for events using vector similarity.
        
        Args:
            query: Search query text
            top_k: Number of top results to return
            threshold: Similarity threshold (0.0 to 1.0)
            container: Container name
            
        Returns:
            List of event documents
        """
        container = container or self.default_container
        try:
            url = f"{self.base_url}/api/{container}/search"
            payload = {
                "query": query,
                "topK": top_k,
                "threshold": threshold
            }
            
            self.logger.info(f"Searching events in container '{container}' with query: '{query}'")
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

    def get_embedding(self, text: str, container: Optional[str] = None) -> Optional[List[float]]:
        """
        Get vector embedding for text.
        
        Args:
            text: Text to embed
            container: Container name
            
        Returns:
            Vector embedding as list of floats, or None if error
        """
        container = container or self.default_container
        try:
            url = f"{self.base_url}/api/{container}/embedding"
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

    def bulk_upload_events(self, events: List[Dict], container: Optional[str] = None) -> Dict:
        """
        Upload events in bulk to the vector database.
        
        Args:
            events: List of event dictionaries from scraper
            container: Container name
            
        Returns:
            Upload result summary
        """
        container = container or self.default_container
        try:
            url = f"{self.base_url}/api/{container}/bulk-upload"
            payload = {"events": events}
            
            self.logger.info(f"Uploading {len(events)} events to vector database in container '{container}'")
            successful_upserts = 0
            total_events = len(events)
            failed_events = []
            
            for event in events:
                if self.upload_event_with_retry(event, url):
                    successful_upserts += 1
                else:
                    failed_events.append(event)
            
            result = {
                "successfulUpserts": successful_upserts,
                "totalEvents": total_events,
                "failedEvents": failed_events
            }
            self.logger.info(f"Upload completed: {successful_upserts}/{total_events} successful")
            return result
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error uploading events: {e}")
            return {"error": str(e)}
        except Exception as e:
            self.logger.error(f"Unexpected error uploading events: {e}")
            return {"error": str(e)}

    def upload_event_with_retry(self, event, url, max_retries=3, backoff=2):
        for attempt in range(max_retries):
            response = requests.post(url, json={"events": [event]})
            if response.status_code == 200:
                return True
            elif response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", backoff))
                time.sleep(retry_after)
            else:
                break
        return False

    def get_event_count(self, container: Optional[str] = None) -> int:
        """
        Get total number of events in the database.
        
        Args:
            container: Container name
            
        Returns:
            Number of events
        """
        container = container or self.default_container
        try:
            url = f"{self.base_url}/api/{container}/count"
            response = self.session.get(url)
            response.raise_for_status()
            
            result = response.json()
            return result.get("Count", 0)
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error getting event count: {e}")
            return 0
        except Exception as e:
            self.logger.error(f"Unexpected error getting event count: {e}")
            return 0

    def get_all_events(self, container: Optional[str] = None) -> List[Dict]:
        """
        Get all events from the database.
        
        Args:
            container: Container name
            
        Returns:
            List of all event documents
        """
        container = container or self.default_container
        try:
            url = f"{self.base_url}/api/{container}"
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

    def health_check(self, container: Optional[str] = None) -> bool:
        """
        Check if the API service is available.
        
        Args:
            container: Container name
            
        Returns:
            True if service is available, False otherwise
        """
        container = container or self.default_container
        try:
            url = f"{self.base_url}/api/{container}/count"
            response = self.session.get(url, timeout=5)
            return response.status_code == 200
        except:
            return False

    def upload_scraped_data(self, json_file_path: str, container: Optional[str] = None) -> Dict:
        """
        Upload scraped data from JSON file to vector database.
        
        Args:
            json_file_path: Path to JSON file with scraped events
            container: Container name
            
        Returns:
            Upload result summary
        """
        container = container or self.default_container
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                events = json.load(f)
            
            if not isinstance(events, list):
                raise ValueError("JSON file must contain a list of events")
            
            return self.bulk_upload_events(events, container=container)
            
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

    def delete_all_events(self, container: Optional[str] = None) -> bool:
        container = container or self.default_container
        try:
            url = f"{self.base_url}/api/{container}"
            response = self.session.delete(url)
            response.raise_for_status()
            return response.status_code == 204
        except Exception as e:
            self.logger.error(f"Error deleting all events: {e}")
            return False 