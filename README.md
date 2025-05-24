# Event Chatbot with Embedding Service

This project consists of two main components:
1. A Python-based chatbot that uses LangChain and Ollama for natural language processing
2. A .NET-based embedding service that handles document embeddings and database operations

## Project Structure

```
.
├── src/
│   ├── python/
│   │   ├── chatbot/        # Chatbot implementation
│   │   ├── scraper/        # Web scraping components
│   │   └── utils/          # Utility functions
│   └── dotnet/
│       └── EmbeddingService/
│           ├── EmbeddingService.API        # REST API endpoints
│           ├── EmbeddingService.Core       # Business logic
│           └── EmbeddingService.Infrastructure  # Database and external services
├── data/
│   └── processed/          # Processed data files
└── docs/                   # Documentation
```

## Setup

### Python Environment

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### .NET Environment

1. Install .NET SDK 8.0 or later
2. Navigate to the EmbeddingService directory:
```bash
cd src/dotnet/EmbeddingService
```

3. Restore dependencies:
```bash
dotnet restore
```

4. Build the solution:
```bash
dotnet build
```

## Running the Application

### Python Chatbot

1. Activate the virtual environment
2. Run the chatbot:
```bash
python src/python/chatbot/chatbot.py
```

### Embedding Service

1. Navigate to the API project:
```bash
cd src/dotnet/EmbeddingService/EmbeddingService.API
```

2. Run the service:
```bash
dotnet run
```

## Development

- Python code follows PEP 8 style guide
- .NET code follows Microsoft's C# coding conventions
- Both components communicate via REST API
- Database operations are handled by the .NET service
- Embeddings are generated and stored by the .NET service

## Data Flow

1. Scraper collects data from the target website
2. Data is processed and cleaned
3. Embedding service generates embeddings and stores them
4. Chatbot queries the embedding service for relevant information
5. Chatbot uses LLM to generate responses based on retrieved information 