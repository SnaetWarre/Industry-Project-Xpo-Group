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

public class DailyAnalytics
{
    [JsonPropertyName("totalRegistrationClicks")]
    public int TotalRegistrationClicks { get; set; } = 0;

    [JsonPropertyName("uniqueSessions")]
    public HashSet<string> UniqueSessions { get; set; } = new();

    [JsonPropertyName("companyStats")]
    public Dictionary<string, int> CompanyStats { get; set; } = new();
}

public class WeeklyAnalytics
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("year")]
    public string Year { get; set; } = string.Empty;

    [JsonPropertyName("week")]
    public int Week { get; set; }

    [JsonPropertyName("website")]
    public string Website { get; set; } = string.Empty;

    [JsonPropertyName("days")]
    public Dictionary<string, DailyAnalytics> Days { get; set; } = new();

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
} 