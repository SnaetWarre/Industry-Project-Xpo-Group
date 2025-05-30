#!/usr/bin/env python3
"""
Script to upload scraped event data to the vector database.
This script can be run after scraping to populate the CosmosDB with vector embeddings.
"""

import argparse
import json
import logging
import sys
from vector_api_client import VectorApiClient

def setup_logging(verbose: bool = False):
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def validate_json_file(file_path: str) -> bool:
    """Validate that the JSON file exists and contains valid event data."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            print(f"Error: {file_path} must contain a JSON array of events")
            return False
        
        if len(data) == 0:
            print(f"Warning: {file_path} contains no events")
            return True
        
        # Check if first item has expected fields
        first_event = data[0]
        required_fields = ['title', 'description', 'url']
        missing_fields = [field for field in required_fields if field not in first_event]
        
        if missing_fields:
            print(f"Warning: Events may be missing required fields: {missing_fields}")
        
        print(f"✓ JSON file validated: {len(data)} events found")
        return True
        
    except FileNotFoundError:
        print(f"Error: File {file_path} not found")
        return False
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {file_path}: {e}")
        return False
    except Exception as e:
        print(f"Error validating {file_path}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Upload scraped event data to vector database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python upload_to_vector_db.py output.json
  python upload_to_vector_db.py --api-url http://localhost:5000 --verbose output.json
  python upload_to_vector_db.py --dry-run output.json
        """
    )
    
    parser.add_argument(
        'json_file',
        help='Path to JSON file containing scraped event data'
    )
    
    parser.add_argument(
        '--api-url',
        default='http://localhost:5000',
        help='URL of the Vector Embedding Service API (default: http://localhost:5000)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Validate the JSON file without uploading to database'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    parser.add_argument(
        '--container',
        default='ffd',
        choices=['ffd', 'artisan', 'abiss'],
        help='Target CosmosDB container: ffd, artisan, or abiss (default: ffd)'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)
    
    print("=" * 60)
    print("Vector Database Upload Tool")
    print("=" * 60)
    
    # Validate JSON file
    print(f"\n1. Validating JSON file: {args.json_file}")
    if not validate_json_file(args.json_file):
        sys.exit(1)
    
    if args.dry_run:
        print("\n✓ Dry run completed successfully - JSON file is valid")
        sys.exit(0)
    
    # Initialize API client
    print(f"\n2. Connecting to Vector API: {args.api_url} (container: {args.container})")
    client = VectorApiClient(args.api_url, default_container=args.container)
    
    # Check service health
    if not client.health_check():
        print(f"✗ Cannot connect to Vector API at {args.api_url} (container: {args.container})")
        print("Make sure the C# Vector Embedding Service is running")
        sys.exit(1)
    
    print(f"✓ Vector API service is available for container '{args.container}'")
    
    # Get current database stats
    current_count = client.get_event_count()
    print(f"✓ Current database contains {current_count} events in container '{args.container}'")
    
    # Delete all events from the container
    print(f"\n3. Deleting all events from container '{args.container}'")
    if not client.delete_all_events(args.container):
        print(f"✗ Failed to delete all events from container '{args.container}'")
        sys.exit(1)
    
    # Upload data
    print(f"\n4. Uploading data from {args.json_file} to container '{args.container}'")
    result = client.upload_scraped_data(args.json_file)
    
    if "error" in result:
        print(f"✗ Upload failed: {result['error']}")
        sys.exit(1)
    
    # Display results
    print("\n" + "=" * 60)
    print("UPLOAD COMPLETED SUCCESSFULLY")
    print("=" * 60)
    print(f"Total events processed: {result.get('totalEvents', 0)}")
    print(f"Successful uploads: {result.get('successfulUpserts', 0)}")
    print(f"Failed uploads: {result.get('failedUpserts', 0)}")
    
    if result.get('failedUpserts', 0) > 0:
        print(f"\n⚠️  {result.get('failedUpserts', 0)} events failed to upload")
        print("Check the C# service logs for details")
    
    # Final database stats
    final_count = client.get_event_count()
    new_events = final_count - current_count
    print(f"\nDatabase now contains {final_count} events (+{new_events} new) in container '{args.container}'")
    
    print("\n✓ You can now use the vector chatbot to search these events!")

if __name__ == "__main__":
    main() 