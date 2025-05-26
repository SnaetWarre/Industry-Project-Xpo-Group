using System.Text.Json.Serialization;

namespace VectorEmbeddingService.Models;

public class SearchRequest
{
    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    [JsonPropertyName("topK")]
    public int TopK { get; set; } = 5;

    [JsonPropertyName("threshold")]
    public double Threshold { get; set; } = 0.7;
}

public class EmbeddingRequest
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public class BulkUploadRequest
{
    [JsonPropertyName("events")]
    public List<EventData> Events { get; set; } = new();
}

public class EventData
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("socialmedia_links")]
    public List<string> SocialMediaLinks { get; set; } = new();

    [JsonPropertyName("stand_numbers")]
    public List<string> StandNumbers { get; set; } = new();

    [JsonPropertyName("raw_text_content")]
    public string RawTextContent { get; set; } = string.Empty;

    [JsonPropertyName("source_type")]
    public string SourceType { get; set; } = string.Empty;
} 