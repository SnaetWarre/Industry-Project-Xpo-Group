using Microsoft.AspNetCore.Mvc;
using VectorEmbeddingService.Models;
using VectorEmbeddingService.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace VectorEmbeddingService.Controllers;

[ApiController]
[Route("api/artisan")]
public class ArtisanController : ControllerBase
{
    private readonly ICosmosDbService _cosmosDbService;
    private readonly IEmbeddingService _embeddingService;
    private readonly ILogger<ArtisanController> _logger;

    public ArtisanController(CosmosClient cosmosClient, IEmbeddingService embeddingService, ILogger<ArtisanController> logger, ILoggerFactory loggerFactory)
    {
        var databaseName = "XpoData";
        var containerName = "artisan";
        var cosmosLogger = loggerFactory.CreateLogger<CosmosDbService>();
        _cosmosDbService = new CosmosDbService(cosmosClient, embeddingService, databaseName, containerName, cosmosLogger);
        _embeddingService = embeddingService;
        _logger = logger;
    }

    [HttpPost("search")]
    public async Task<ActionResult<List<EventDocument>>> SearchEvents([FromBody] SearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest("Query cannot be empty");
        var queryEmbedding = await _embeddingService.GetEmbeddingAsync(request.Query);
        var similarEvents = await _cosmosDbService.SearchSimilarEventsAsync(queryEmbedding, request.TopK, request.Threshold);
        _logger.LogInformation("Search completed for query: '{Query}', found {Count} results", request.Query, similarEvents.Count);
        return Ok(similarEvents);
    }

    [HttpPost("embedding")]
    public async Task<ActionResult<float[]>> GetEmbedding([FromBody] EmbeddingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Text cannot be empty");
        var embedding = await _embeddingService.GetEmbeddingAsync(request.Text);
        return Ok(embedding);
    }

    [HttpPost("bulk-upload")]
    public async Task<ActionResult<object>> BulkUploadEvents([FromBody] BulkUploadRequest request)
    {
        if (request.Events == null || request.Events.Count == 0)
            return BadRequest("No events provided");
        _logger.LogInformation("Starting bulk upload of {Count} events", request.Events.Count);
        var eventDocuments = new List<EventDocument>();
        foreach (var eventData in request.Events)
        {
            var embeddingText = $"{eventData.Title} {eventData.Description} {eventData.RawTextContent}".Trim();
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
        var upsertedIds = await _cosmosDbService.BulkUpsertEventsAsync(eventDocuments);
        var result = new
        {
            TotalEvents = request.Events.Count,
            SuccessfulUpserts = upsertedIds.Count,
            FailedUpserts = request.Events.Count - upsertedIds.Count,
            UpsertedIds = upsertedIds
        };
        _logger.LogInformation("Bulk upload completed: {Successful}/{Total} events uploaded successfully", upsertedIds.Count, request.Events.Count);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EventDocument>> GetEvent(string id)
    {
        var eventDocument = await _cosmosDbService.GetEventByIdAsync(id);
        if (eventDocument == null)
            return NotFound($"Event with ID {id} not found");
        return Ok(eventDocument);
    }

    [HttpGet]
    public async Task<ActionResult<List<EventDocument>>> GetAllEvents()
    {
        var events = await _cosmosDbService.GetAllEventsAsync();
        return Ok(events);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteEvent(string id)
    {
        var deleted = await _cosmosDbService.DeleteEventAsync(id);
        if (!deleted)
            return NotFound($"Event with ID {id} not found");
        return NoContent();
    }

    [HttpGet("count")]
    public async Task<ActionResult<object>> GetEventCount()
    {
        var count = await _cosmosDbService.GetEventCountAsync();
        return Ok(new { Count = count });
    }

    [HttpPost("chat")]
    public async Task<ActionResult<object>> GetChatbotResponse([FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest("Query cannot be empty");
        var queryEmbedding = await _embeddingService.GetEmbeddingAsync(request.Query);
        var similarEvents = await _cosmosDbService.SearchSimilarEventsAsync(queryEmbedding, request.TopK ?? 5, request.Threshold ?? 0.5);
        var formattedEvents = similarEvents.Select(e => new
        {
            Title = e.Title,
            Description = e.Description,
            Url = e.Url,
            StandNumbers = e.StandNumbers,
            SocialMediaLinks = e.SocialMediaLinks,
            RawTextContent = e.RawTextContent
        }).ToList();
        _logger.LogInformation("Chat query processed: '{Query}', found {Count} relevant events", request.Query, formattedEvents.Count);
        return Ok(new
        {
            Query = request.Query,
            RelevantEvents = formattedEvents,
            TotalResults = formattedEvents.Count
        });
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAllEvents()
    {
        await _cosmosDbService.DeleteAllEventsAsync();
        return NoContent();
    }
} 