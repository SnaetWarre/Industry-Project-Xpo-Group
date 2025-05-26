using Microsoft.Azure.Cosmos;
using VectorEmbeddingService.Models;
using System.Net;

namespace VectorEmbeddingService.Services;

public class CosmosDbService : ICosmosDbService
{
    private readonly Container _container;
    private readonly IEmbeddingService _embeddingService;
    private readonly ILogger<CosmosDbService> _logger;

    public CosmosDbService(
        CosmosClient cosmosClient,
        IEmbeddingService embeddingService,
        IConfiguration configuration,
        ILogger<CosmosDbService> logger)
    {
        var databaseName = configuration["CosmosDb:DatabaseName"] ?? throw new ArgumentNullException("CosmosDb:DatabaseName");
        var containerName = configuration["CosmosDb:ContainerName"] ?? throw new ArgumentNullException("CosmosDb:ContainerName");
        
        _container = cosmosClient.GetContainer(databaseName, containerName);
        _embeddingService = embeddingService;
        _logger = logger;
    }

    public async Task<string> UpsertEventAsync(EventDocument eventDocument)
    {
        try
        {
            if (string.IsNullOrEmpty(eventDocument.Id))
            {
                eventDocument.Id = Guid.NewGuid().ToString();
            }

            eventDocument.UpdatedAt = DateTime.UtcNow;

            var response = await _container.UpsertItemAsync(
                eventDocument,
                new PartitionKey(eventDocument.Id));

            _logger.LogInformation("Upserted event with ID: {EventId}", eventDocument.Id);
            return eventDocument.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting event with ID: {EventId}", eventDocument.Id);
            throw;
        }
    }

    public async Task<List<string>> BulkUpsertEventsAsync(List<EventDocument> eventDocuments)
    {
        var upsertedIds = new List<string>();
        var batchSize = 100; // Process in batches to avoid overwhelming CosmosDB

        for (int i = 0; i < eventDocuments.Count; i += batchSize)
        {
            var batch = eventDocuments.Skip(i).Take(batchSize).ToList();
            var tasks = batch.Select(async eventDoc =>
            {
                try
                {
                    var id = await UpsertEventAsync(eventDoc);
                    return id;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to upsert event: {Title}", eventDoc.Title);
                    return null;
                }
            });

            var results = await Task.WhenAll(tasks);
            upsertedIds.AddRange(results.Where(id => id != null)!);

            _logger.LogInformation("Processed batch {BatchNumber}/{TotalBatches}", 
                (i / batchSize) + 1, 
                (eventDocuments.Count + batchSize - 1) / batchSize);
        }

        _logger.LogInformation("Bulk upsert completed. Successfully upserted {Count}/{Total} events", 
            upsertedIds.Count, eventDocuments.Count);

        return upsertedIds;
    }

    public async Task<List<EventDocument>> SearchSimilarEventsAsync(float[] queryEmbedding, int topK = 5, double threshold = 0.7)
    {
        try
        {
            // Get all events with embeddings
            var query = "SELECT * FROM c WHERE IS_DEFINED(c.embedding) AND ARRAY_LENGTH(c.embedding) > 0";
            var queryDefinition = new QueryDefinition(query);
            
            var events = new List<EventDocument>();
            using var feedIterator = _container.GetItemQueryIterator<EventDocument>(queryDefinition);
            
            while (feedIterator.HasMoreResults)
            {
                var response = await feedIterator.ReadNextAsync();
                events.AddRange(response);
            }

            // Calculate similarities and filter
            var similarEvents = new List<(EventDocument Event, double Similarity)>();

            foreach (var eventDoc in events)
            {
                if (eventDoc.Embedding?.Length > 0)
                {
                    var similarity = _embeddingService.CalculateCosineSimilarity(queryEmbedding, eventDoc.Embedding);
                    if (similarity >= threshold)
                    {
                        similarEvents.Add((eventDoc, similarity));
                    }
                }
            }

            // Sort by similarity and take top K
            var topEvents = similarEvents
                .OrderByDescending(x => x.Similarity)
                .Take(topK)
                .Select(x => x.Event)
                .ToList();

            _logger.LogInformation("Found {Count} similar events above threshold {Threshold}", 
                topEvents.Count, threshold);

            return topEvents;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching for similar events");
            throw;
        }
    }

    public async Task<EventDocument?> GetEventByIdAsync(string id)
    {
        try
        {
            var response = await _container.ReadItemAsync<EventDocument>(id, new PartitionKey(id));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting event by ID: {EventId}", id);
            throw;
        }
    }

    public async Task<List<EventDocument>> GetAllEventsAsync()
    {
        try
        {
            var query = "SELECT * FROM c WHERE IS_DEFINED(c.title)";
            var queryDefinition = new QueryDefinition(query);
            
            var events = new List<EventDocument>();
            using var feedIterator = _container.GetItemQueryIterator<EventDocument>(queryDefinition);
            
            while (feedIterator.HasMoreResults)
            {
                var response = await feedIterator.ReadNextAsync();
                events.AddRange(response);
            }

            return events;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all events");
            throw;
        }
    }

    public async Task<bool> DeleteEventAsync(string id)
    {
        try
        {
            await _container.DeleteItemAsync<EventDocument>(id, new PartitionKey(id));
            _logger.LogInformation("Deleted event with ID: {EventId}", id);
            return true;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Event with ID {EventId} not found for deletion", id);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting event with ID: {EventId}", id);
            throw;
        }
    }

    public async Task<int> GetEventCountAsync()
    {
        try
        {
            var query = "SELECT VALUE COUNT(1) FROM c WHERE IS_DEFINED(c.title)";
            var queryDefinition = new QueryDefinition(query);
            
            using var feedIterator = _container.GetItemQueryIterator<int>(queryDefinition);
            var response = await feedIterator.ReadNextAsync();
            
            return response.FirstOrDefault();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting event count");
            throw;
        }
    }
} 