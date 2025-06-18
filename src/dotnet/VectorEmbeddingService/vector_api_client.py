import requests
import json
from typing import List, Dict, Optional
import logging
import time
import os
import urllib3

# Disable InsecureRequestWarning
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

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
        self.jwt = None
        self._login_and_set_jwt()

    def _login_and_set_jwt(self):
        username = os.environ.get("UPLOAD_SERVICE_USERNAME")
        password = os.environ.get("UPLOAD_SERVICE_PASSWORD")
        if not username or not password:
            raise RuntimeError("UPLOAD_SERVICE_USERNAME and UPLOAD_SERVICE_PASSWORD must be set as environment variables.")
        login_url = f"{self.base_url}/api/auth/login"
        try:
            resp = self.session.post(login_url, json={"username": username, "password": password})
            resp.raise_for_status()
            token = resp.json().get("token")
            if not token:
                raise RuntimeError(f"Login failed: No token returned. Response: {resp.text}")
            self.jwt = token
            self.session.headers.update({"Authorization": f"Bearer {self.jwt}"})
            self.logger.info("Successfully authenticated and set JWT header.")
        except Exception as e:
            raise RuntimeError(f"Failed to authenticate with API: {e}")

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

            self.logger.warning(f"Upload started: {len(events)} events to '{container}'")

            # Transform events to match API's expected format
            transformed_events = []
            for event in events:
                transformed_event = {
                    "title": event.get("title", ""),
                    "description": event.get("description", ""),
                    "url": event.get("url", ""),
                    "socialmedia_links": event.get("socialmedia_links", []),
                    "stand_numbers": event.get("stand_numbers", []) if isinstance(event.get("stand_numbers"), list) else [],
                    "raw_text_content": event.get("raw_text_content", ""),
                    "source_type": event.get("source_type", "")
                }
                transformed_events.append(transformed_event)

            # Upload events one at a time with retry logic
            successful_upserts = 0
            failed_upserts = 0

            for event in transformed_events:
                if self.upload_event_with_retry(event, url):
                    successful_upserts += 1
                else:
                    failed_upserts += 1
                    # Keep error logs for actual failures
                    self.logger.error(f"Failed to upload event: {event.get('title', 'Unknown')}")

            result = {
                "totalEvents": len(events),
                "successfulUpserts": successful_upserts,
                "failedUpserts": failed_upserts
            }

            self.logger.warning(f"Upload completed: {successful_upserts}/{len(events)} successful, {failed_upserts} failed")
            return result

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error uploading events: {e}")
            return {"error": str(e)}
        except Exception as e:
            self.logger.error(f"Unexpected error uploading events: {e}")
            return {"error": str(e)}

    def upload_event_with_retry(self, event, url, max_retries=3, backoff=2):
        for attempt in range(max_retries):
            try:
                response = self.session.post(url, json={"events": [event]})
                if response.status_code == 200:
                    result = response.json()
                    successful_upserts = result.get("successfulUpserts", 0)
                    failed_upserts = result.get("failedUpserts", 0)
                    total_events = result.get("totalEvents", 0)
                    upserted_ids = result.get("upsertedIds", [])

                    # Only log if there are failed upserts for important events
                    if failed_upserts > 0 and successful_upserts == 0:
                        self.logger.error(f"Upload failed for event: {event.get('title', 'Unknown')}")

                    # Consider it a success if we have any successful upserts OR if we have upserted IDs
                    if successful_upserts > 0 or len(upserted_ids) > 0:
                        return True
                elif response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", backoff))
                    self.logger.debug(f"Rate limited, waiting {retry_after} seconds")
                    time.sleep(retry_after)
                else:
                    self.logger.error(f"Failed to upload event (attempt {attempt + 1}/{max_retries}): {response.status_code} - {response.text}")
                    break
            except Exception as e:
                self.logger.error(f"Error during upload attempt {attempt + 1}: {str(e)}")
                if attempt == max_retries - 1:
                    break
                time.sleep(backoff)
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
