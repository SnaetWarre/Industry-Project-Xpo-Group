using Azure;
using Azure.AI.OpenAI;

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
        {
            throw new ArgumentException("Embeddings must have the same length");
        }

        double dotProduct = 0;
        double magnitude1 = 0;
        double magnitude2 = 0;

        for (int i = 0; i < embedding1.Length; i++)
        {
            dotProduct += embedding1[i] * embedding2[i];
            magnitude1 += embedding1[i] * embedding1[i];
            magnitude2 += embedding2[i] * embedding2[i];
        }

        magnitude1 = Math.Sqrt(magnitude1);
        magnitude2 = Math.Sqrt(magnitude2);

        if (magnitude1 == 0 || magnitude2 == 0)
        {
            return 0;
        }

        return dotProduct / (magnitude1 * magnitude2);
    }

    private static string CleanText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        // Remove excessive whitespace and limit length
        var cleaned = System.Text.RegularExpressions.Regex.Replace(text.Trim(), @"\s+", " ");
        
        // Limit to approximately 8000 tokens (rough estimate: 1 token ≈ 4 characters)
        const int maxLength = 32000;
        if (cleaned.Length > maxLength)
        {
            cleaned = cleaned.Substring(0, maxLength);
        }

        return cleaned;
    }
} 