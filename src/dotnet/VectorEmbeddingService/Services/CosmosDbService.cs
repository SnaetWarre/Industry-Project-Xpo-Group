using Microsoft.Azure.Cosmos;
using VectorEmbeddingService.Models;
using System.Net;
using System.Linq;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Globalization;

namespace VectorEmbeddingService.Services;

public class CosmosDbService : ICosmosDbService
{
    private readonly Container _container;
    private readonly IEmbeddingService _embeddingService;
    private readonly ILogger<CosmosDbService> _logger;

    public CosmosDbService(
        CosmosClient cosmosClient,
        IEmbeddingService embeddingService,
        string databaseName,
        string containerName,
        ILogger<CosmosDbService> logger)
    {
        _container = cosmosClient.GetContainer(databaseName, containerName);
        _embeddingService = embeddingService;
        _logger = logger;
    }

    private static float SafeToFloat(object? x)
    {
        if (x == null) return 0f;
        if (x is float f) return f;
        if (x is double d) return (float)d;
        if (x is int i) return i;
        if (x is long l) return l;
        if (x is decimal m) return (float)m;
        if (x is string s && float.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var result)) return result;
        var type = x.GetType();
        if (type.FullName == "Newtonsoft.Json.Linq.JValue")
        {
            var valueProp = type.GetProperty("Value");
            if (valueProp != null)
            {
                var value = valueProp.GetValue(x);
                return SafeToFloat(value);
            }
        }
        try { return Convert.ToSingle(x, CultureInfo.InvariantCulture); } catch { return 0f; }
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

    // Use projection queries to fetch only the fields needed for similarity search and result formatting
    public async Task<List<EventDocument>> SearchSimilarEventsAsync(float[] queryEmbedding, int topK = 5, double threshold = 0.7)
    {
        try
        {
            // Only select the fields we need for similarity and result formatting
            var query = @"SELECT c.id, c.title, c.description, c.url, c.socialMediaLinks, c.standNumbers, c.rawTextContent, c.sourceType, c.embedding, c.embeddingText, c.createdAt, c.updatedAt FROM c WHERE IS_DEFINED(c.embedding) AND ARRAY_LENGTH(c.embedding) > 0";
            var queryDefinition = new QueryDefinition(query);
            var events = new List<EventDocument>();
            using var feedIterator = _container.GetItemQueryIterator<dynamic>(queryDefinition);
            while (feedIterator.HasMoreResults)
            {
                var response = await feedIterator.ReadNextAsync();
                foreach (var item in response)
                {
                    events.Add(new EventDocument
                    {
                        Id = item.id,
                        Title = item.title,
                        Description = item.description,
                        Url = item.url,
                        SocialMediaLinks = item.socialMediaLinks != null
                            ? ((IEnumerable<object>)item.socialMediaLinks)
                                .Where(x => x != null)
                                .Select(x => x.ToString()!)
                                .Cast<string>()
                                .ToList()
                            : new List<string>(),   
                        StandNumbers = item.standNumbers != null
                            ? ((IEnumerable<object>)item.standNumbers)
                                .Where(x => x != null)
                                .Select(x => x.ToString()!)
                                .Cast<string>()
                                .ToList()
                            : new List<string>(),
                        RawTextContent = item.rawTextContent,
                        SourceType = item.sourceType,
                        Embedding = ((IEnumerable<object>)item.embedding).Select(x => SafeToFloat(x)).ToArray(),
                        EmbeddingText = item.embeddingText,
                        CreatedAt = item.createdAt != null ? (DateTime)item.createdAt : DateTime.MinValue,
                        UpdatedAt = item.updatedAt != null ? (DateTime)item.updatedAt : DateTime.MinValue
                    });
                }
            }

            // Calculate similarities and filter in parallel
            var similarEvents = new ConcurrentBag<(EventDocument Event, double Similarity)>();
            Parallel.ForEach(events, eventDoc =>
            {
                if (eventDoc.Embedding?.Length > 0)
                {
                    var similarity = _embeddingService.CalculateCosineSimilarity(queryEmbedding, eventDoc.Embedding);
                    if (similarity >= threshold)
                    {
                        similarEvents.Add((eventDoc, similarity));
                    }
                }
            });

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

    // Use projection queries for GetAllEventsAsync as well
    public async Task<List<EventDocument>> GetAllEventsAsync()
    {
        try
        {
            var query = @"SELECT c.id, c.title, c.description, c.url, c.socialMediaLinks, c.standNumbers, c.rawTextContent, c.sourceType, c.embedding, c.embeddingText, c.createdAt, c.updatedAt FROM c WHERE IS_DEFINED(c.title)";
            var queryDefinition = new QueryDefinition(query);
            var events = new List<EventDocument>();
            using var feedIterator = _container.GetItemQueryIterator<dynamic>(queryDefinition);
            while (feedIterator.HasMoreResults)
            {
                var response = await feedIterator.ReadNextAsync();
                foreach (var item in response)
                {
                    events.Add(new EventDocument
                    {
                        Id = item.id,
                        Title = item.title,
                        Description = item.description,
                        Url = item.url,
                        SocialMediaLinks = item.socialMediaLinks != null
                            ? ((IEnumerable<object>)item.socialMediaLinks)
                                .Where(x => x != null)
                                .Select(x => x.ToString()!)
                                .Cast<string>()
                                .ToList()
                            : new List<string>(),
                        StandNumbers = item.standNumbers != null ? ((IEnumerable<object>)item.standNumbers).Where(x => x != null).Select(x => x.ToString()!).ToList() : new List<string>(),
                        RawTextContent = item.rawTextContent,
                        SourceType = item.sourceType,
                        Embedding = item.embedding != null ? ((IEnumerable<object>)item.embedding).Where(x => x != null).Select(x => SafeToFloat(x)).ToArray() : Array.Empty<float>(),
                        EmbeddingText = item.embeddingText,
                        CreatedAt = item.createdAt != null ? (DateTime)item.createdAt : DateTime.MinValue,
                        UpdatedAt = item.updatedAt != null ? (DateTime)item.updatedAt : DateTime.MinValue
                    });
                }
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

    public async Task DeleteAllEventsAsync()
    {
        var query = "SELECT c.id FROM c";
        var queryDefinition = new QueryDefinition(query);
        using var feedIterator = _container.GetItemQueryIterator<dynamic>(queryDefinition);

        var ids = new List<string>();
        while (feedIterator.HasMoreResults)
        {
            var response = await feedIterator.ReadNextAsync();
            foreach (var item in response)
            {
                ids.Add(item.id.ToString());
            }
        }

        foreach (var id in ids)
        {
            await _container.DeleteItemAsync<EventDocument>(id, new PartitionKey(id));
        }
    }

    public async Task<EventDocument?> GetEventByUrlAsync(string url)
    {
        try
        {
            var queryDef = new QueryDefinition("SELECT * FROM c WHERE c.url = @url").WithParameter("@url", url);
            using var iterator = _container.GetItemQueryIterator<EventDocument>(queryDef);
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                var evt = response.FirstOrDefault();
                if (evt != null)
                    return evt;
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting event by URL: {Url}", url);
            throw;
        }
    }
} 