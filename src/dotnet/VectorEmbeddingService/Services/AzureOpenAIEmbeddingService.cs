using Azure;
using Azure.AI.OpenAI;
using System.Numerics;

namespace VectorEmbeddingService.Services;

public class AzureOpenAIEmbeddingService : IEmbeddingService
{
    private readonly OpenAIClient _openAIClient;
    private readonly string _deploymentName;
    private readonly ILogger<AzureOpenAIEmbeddingService> _logger;

    public AzureOpenAIEmbeddingService(
        IConfiguration configuration,
        ILogger<AzureOpenAIEmbeddingService> logger)
    {
        var endpoint = configuration["AzureOpenAIEmbedding:Endpoint"] ?? throw new ArgumentNullException("AzureOpenAIEmbedding:Endpoint");
        var apiKey = configuration["AzureOpenAIEmbedding:ApiKey"] ?? throw new ArgumentNullException("AzureOpenAIEmbedding:ApiKey");
        _deploymentName = configuration["AzureOpenAIEmbedding:EmbeddingDeploymentName"] ?? throw new ArgumentNullException("AzureOpenAIEmbedding:EmbeddingDeploymentName");
        
        _openAIClient = new OpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
        _logger = logger;
    }

    public async Task<float[]> GetEmbeddingAsync(string text)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                throw new ArgumentException("Text cannot be null or empty", nameof(text));
            }

            // Clean and truncate text if necessary (Azure OpenAI has token limits)
            var cleanedText = CleanText(text);
            
            var embeddingOptions = new EmbeddingsOptions(_deploymentName, new[] { cleanedText });
            var response = await _openAIClient.GetEmbeddingsAsync(embeddingOptions);
            
            if (response.Value.Data.Count == 0)
            {
                throw new InvalidOperationException("No embeddings returned from Azure OpenAI");
            }

            return response.Value.Data[0].Embedding.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embedding for text: {Text}", text.Substring(0, Math.Min(100, text.Length)));
            throw;
        }
    }

    public async Task<List<float[]>> GetEmbeddingsAsync(List<string> texts)
    {
        try
        {
            if (texts == null || texts.Count == 0)
            {
                return new List<float[]>();
            }

            var cleanedTexts = texts.Select(CleanText).ToList();
            var embeddingOptions = new EmbeddingsOptions(_deploymentName, cleanedTexts);
            var response = await _openAIClient.GetEmbeddingsAsync(embeddingOptions);

            return response.Value.Data.Select(d => d.Embedding.ToArray()).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embeddings for {Count} texts", texts.Count);
            throw;
        }
    }

    public double CalculateCosineSimilarity(float[] embedding1, float[] embedding2)
    {
        if (embedding1.Length != embedding2.Length)
            throw new ArgumentException("Embeddings must have the same length");

        int length = embedding1.Length;
        int simdLength = Vector<float>.Count;
        int i = 0;

        Vector<float> dotProductVec = Vector<float>.Zero;
        Vector<float> magnitude1Vec = Vector<float>.Zero;
        Vector<float> magnitude2Vec = Vector<float>.Zero;

        // SIMD loop
        for (; i <= length - simdLength; i += simdLength)
        {
            var v1 = new Vector<float>(embedding1, i);
            var v2 = new Vector<float>(embedding2, i);

            dotProductVec += v1 * v2;
            magnitude1Vec += v1 * v1;
            magnitude2Vec += v2 * v2;
        }

        float dotProduct = 0, magnitude1 = 0, magnitude2 = 0;
        for (int j = 0; j < simdLength; j++)
        {
            dotProduct += dotProductVec[j];
            magnitude1 += magnitude1Vec[j];
            magnitude2 += magnitude2Vec[j];
        }

        // Scalar loop for remaining elements
        for (; i < length; i++)
        {
            dotProduct += embedding1[i] * embedding2[i];
            magnitude1 += embedding1[i] * embedding1[i];
            magnitude2 += embedding2[i] * embedding2[i];
        }

        double mag1 = Math.Sqrt(magnitude1);
        double mag2 = Math.Sqrt(magnitude2);

        if (mag1 == 0 || mag2 == 0)
            return 0;

        return dotProduct / (mag1 * mag2);
    }

    private static string CleanText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        // Remove excessive whitespace and limit length
        var cleaned = System.Text.RegularExpressions.Regex.Replace(text.Trim(), @"\s+", " ");
        
        const int maxLength = 32000;
        if (cleaned.Length > maxLength)
        {
            cleaned = cleaned.Substring(0, maxLength);
        }

        return cleaned;
    }
} 