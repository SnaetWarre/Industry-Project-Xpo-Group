using System.Text.Json.Serialization;

namespace VectorEmbeddingService.Models;

public class AnalyticsEvent
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = string.Empty;

    [JsonPropertyName("payload")]
    public Dictionary<string, object> Payload { get; set; } = new();
} 