using System.Text.Json.Serialization;

namespace VectorEmbeddingService.Models;

public class EventDocument
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("socialMediaLinks")]
    public List<string> SocialMediaLinks { get; set; } = new();

    [JsonPropertyName("standNumbers")]
    public List<string> StandNumbers { get; set; } = new();

    [JsonPropertyName("rawTextContent")]
    public string RawTextContent { get; set; } = string.Empty;

    [JsonPropertyName("sourceType")]
    public string SourceType { get; set; } = string.Empty;

    [JsonPropertyName("embedding")]
    public float[] Embedding { get; set; } = Array.Empty<float>();

    [JsonPropertyName("embeddingText")]
    public string EmbeddingText { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("_ts")]
    public long Timestamp { get; set; }
} 