using System.Text.Json.Serialization;

namespace VectorEmbeddingService.Models;

public class UserProfile
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("company")]
    public string Company { get; set; } = string.Empty;

    [JsonPropertyName("jobTitle")]
    public string JobTitle { get; set; } = string.Empty;

    [JsonPropertyName("companyDescription")]
    public string CompanyDescription { get; set; } = string.Empty;

    [JsonPropertyName("chatHistory")]
    public List<ChatMessage> ChatHistory { get; set; } = new();

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ChatMessage
{
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("isUser")]
    public bool IsUser { get; set; }
} 