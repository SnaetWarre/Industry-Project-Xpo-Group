# Changelog

## [v1.1.0] - 2025-06-18

### Added
- Complete production-ready release with comprehensive documentation
- Enhanced Docker deployment with optimized containerization
- Improved error handling and logging throughout the application
- Production environment configuration and deployment scripts
- Enhanced security measures and authentication flows

### Changed
- Refined user interface and user experience across all components
- Enhanced dashboard analytics and reporting capabilities
- Streamlined deployment process with better configuration management
- Improved chatbot header

### Fixed
- Resolved remaining stability issues in production environment
- Improved error recovery and graceful degradation

## [v1.0.0] - 2025-06-15

### Added
- Next.js dashboard for analytics and chat history (xpodashboard)
- Registration clicks and user profile analytics endpoints
- Downloadable CSV export for registration clicks
- Chat history and statistics visualization
- Improved frontend/backend separation and documentation

### Changed
- Enhanced security and session management

### Fixed
- Various bugfixes and performance improvements

## [v0.1.0] - 2025-06-7

### Added
- Initial beta release (v0.1.0)
- .NET-based vector embedding service (Azure OpenAI + CosmosDB)
- Scrapy-based web scraper for event data ingestion
- Python utilities for data cleaning
- Vanilla Javascript as frontend

## [v0.2.0] - 2025-05-31

### Added
- Conversational entity tracking and follow-up query support in ChatController
- LRU caching for context documents to improve performance
- SIMD-optimized embedding similarity calculation for faster search
- JWT authentication and secure dashboard endpoints
- Analytics: registration tracking, user profile creation, and session ID management
- Sticky registration button and improved registration flow in chatbot UI
- New endpoints for dashboard analytics and user stats

### Changed
- Enhanced security: stricter output sanitization, markdown-only LLM responses, and cookie-based session management
- Improved event search and context handling for chat
- Refactored chatbot.js for better chat history and error handling

### Fixed
- Bugfixes for session handling, frontend chat history, and event data ingestion
- Addressed vulnerabilities in dependencies