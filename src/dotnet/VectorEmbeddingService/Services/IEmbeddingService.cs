namespace VectorEmbeddingService.Services;

public interface IEmbeddingService
{
    Task<float[]> GetEmbeddingAsync(string text);
    Task<List<float[]>> GetEmbeddingsAsync(List<string> texts);
    double CalculateCosineSimilarity(float[] embedding1, float[] embedding2);
} 