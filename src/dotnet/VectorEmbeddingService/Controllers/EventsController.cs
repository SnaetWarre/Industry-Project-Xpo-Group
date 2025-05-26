using Microsoft.AspNetCore.Mvc;
using VectorEmbeddingService.Models;
using VectorEmbeddingService.Services;

namespace VectorEmbeddingService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventsController : ControllerBase
{
    private readonly ICosmosDbService _cosmosDbService;
    private readonly IEmbeddingService _embeddingService;
    private readonly ILogger<EventsController> _logger;

    public EventsController(
        ICosmosDbService cosmosDbService,
        IEmbeddingService embeddingService,
        ILogger<EventsController> logger)
    {
        _cosmosDbService = cosmosDbService;
        _embeddingService = embeddingService;
        _logger = logger;
    }

    [HttpPost("search")]
    public async Task<ActionResult<List<EventDocument>>> SearchEvents([FromBody] SearchRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                return BadRequest("Query cannot be empty");
            }

            // Generate embedding for the search query
            var queryEmbedding = await _embeddingService.GetEmbeddingAsync(request.Query);
            
            // Search for similar events
            var similarEvents = await _cosmosDbService.SearchSimilarEventsAsync(
                queryEmbedding, 
                request.TopK, 
                request.Threshold);

            _logger.LogInformation("Search completed for query: '{Query}', found {Count} results", 
                request.Query, similarEvents.Count);

            return Ok(similarEvents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching events for query: {Query}", request.Query);
            return StatusCode(500, "An error occurred while searching events");
        }
    }

    [HttpPost("embedding")]
    public async Task<ActionResult<float[]>> GetEmbedding([FromBody] EmbeddingRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Text))
            {
                return BadRequest("Text cannot be empty");
            }

            var embedding = await _embeddingService.GetEmbeddingAsync(request.Text);
            return Ok(embedding);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embedding for text: {Text}", 
                request.Text.Substring(0, Math.Min(100, request.Text.Length)));
            return StatusCode(500, "An error occurred while generating embedding");
        }
    }

    [HttpPost("bulk-upload")]
    public async Task<ActionResult<object>> BulkUploadEvents([FromBody] BulkUploadRequest request)
    {
        try
        {
            if (request.Events == null || request.Events.Count == 0)
            {
                return BadRequest("No events provided");
            }

            _logger.LogInformation("Starting bulk upload of {Count} events", request.Events.Count);

            var eventDocuments = new List<EventDocument>();

            foreach (var eventData in request.Events)
            {
                // Create embedding text from title, description, and raw content
                var embeddingText = $"{eventData.Title} {eventData.Description} {eventData.RawTextContent}".Trim();
                
                // Generate embedding
                var embedding = await _embeddingService.GetEmbeddingAsync(embeddingText);

                var eventDocument = new EventDocument
                {
                    Id = Guid.NewGuid().ToString(),
                    Title = eventData.Title,
                    Description = eventData.Description,
                    Url = eventData.Url,
                    SocialMediaLinks = eventData.SocialMediaLinks ?? new List<string>(),
                    StandNumbers = eventData.StandNumbers ?? new List<string>(),
                    RawTextContent = eventData.RawTextContent,
                    SourceType = eventData.SourceType,
                    Embedding = embedding,
                    EmbeddingText = embeddingText,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                eventDocuments.Add(eventDocument);
            }

            // Bulk upsert to CosmosDB
            var upsertedIds = await _cosmosDbService.BulkUpsertEventsAsync(eventDocuments);

            var result = new
            {
                TotalEvents = request.Events.Count,
                SuccessfulUpserts = upsertedIds.Count,
                FailedUpserts = request.Events.Count - upsertedIds.Count,
                UpsertedIds = upsertedIds
            };

            _logger.LogInformation("Bulk upload completed: {Successful}/{Total} events uploaded successfully", 
                upsertedIds.Count, request.Events.Count);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during bulk upload of events");
            return StatusCode(500, "An error occurred during bulk upload");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EventDocument>> GetEvent(string id)
    {
        try
        {
            var eventDocument = await _cosmosDbService.GetEventByIdAsync(id);
            
            if (eventDocument == null)
            {
                return NotFound($"Event with ID {id} not found");
            }

            return Ok(eventDocument);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting event with ID: {EventId}", id);
            return StatusCode(500, "An error occurred while retrieving the event");
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<EventDocument>>> GetAllEvents()
    {
        try
        {
            var events = await _cosmosDbService.GetAllEventsAsync();
            return Ok(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all events");
            return StatusCode(500, "An error occurred while retrieving events");
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteEvent(string id)
    {
        try
        {
            var deleted = await _cosmosDbService.DeleteEventAsync(id);
            
            if (!deleted)
            {
                return NotFound($"Event with ID {id} not found");
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting event with ID: {EventId}", id);
            return StatusCode(500, "An error occurred while deleting the event");
        }
    }

    [HttpGet("count")]
    public async Task<ActionResult<object>> GetEventCount()
    {
        try
        {
            var count = await _cosmosDbService.GetEventCountAsync();
            return Ok(new { Count = count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting event count");
            return StatusCode(500, "An error occurred while getting event count");
        }
    }

    [HttpPost("chat")]
    public async Task<ActionResult<object>> GetChatbotResponse([FromBody] ChatRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                return BadRequest("Query cannot be empty");
            }

            // Generate embedding for the search query
            var queryEmbedding = await _embeddingService.GetEmbeddingAsync(request.Query);
            
            // Search for similar events with a lower threshold for more results
            var similarEvents = await _cosmosDbService.SearchSimilarEventsAsync(
                queryEmbedding, 
                request.TopK ?? 5, 
                request.Threshold ?? 0.5);

            // Format the response for the chatbot
            var formattedEvents = similarEvents.Select(e => new
            {
                Title = e.Title,
                Description = e.Description,
                Url = e.Url,
                StandNumbers = e.StandNumbers,
                SocialMediaLinks = e.SocialMediaLinks,
                RawTextContent = e.RawTextContent
            }).ToList();

            _logger.LogInformation("Chat query processed: '{Query}', found {Count} relevant events", 
                request.Query, formattedEvents.Count);

            return Ok(new
            {
                Query = request.Query,
                RelevantEvents = formattedEvents,
                TotalResults = formattedEvents.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat query: {Query}", request.Query);
            return StatusCode(500, "An error occurred while processing your query");
        }
    }
} 