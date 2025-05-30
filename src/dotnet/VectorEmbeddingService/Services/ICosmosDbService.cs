using VectorEmbeddingService.Models;

namespace VectorEmbeddingService.Services;

// This interface is implemented by CosmosDbService, which is now container-specific (ffd, artisan, abiss).
public interface ICosmosDbService
{
    Task<string> UpsertEventAsync(EventDocument eventDocument);
    Task<List<string>> BulkUpsertEventsAsync(List<EventDocument> eventDocuments);
    Task<List<EventDocument>> SearchSimilarEventsAsync(float[] queryEmbedding, int topK = 5, double threshold = 0.7);
    Task<EventDocument?> GetEventByIdAsync(string id);
    Task<List<EventDocument>> GetAllEventsAsync();
    Task<bool> DeleteEventAsync(string id);
    Task<int> GetEventCountAsync();
    Task DeleteAllEventsAsync();
    Task<EventDocument?> GetEventByUrlAsync(string url);
} 