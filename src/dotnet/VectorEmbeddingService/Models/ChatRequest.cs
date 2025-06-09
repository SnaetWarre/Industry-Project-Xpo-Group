namespace VectorEmbeddingService.Models;
using System.Text.Json.Serialization;

public class ChatRequest
{
    public string Query { get; set; } = string.Empty;
    public int? TopK { get; set; }
    public double? Threshold { get; set; }
    // The target event dataset (e.g., 'ffd', 'artisan', 'abiss')
    [JsonPropertyName("website")]
    public string Website { get; set; } = "ffd";
    [JsonPropertyName("sessionId")]
    public string? SessionId { get; set; }
} 