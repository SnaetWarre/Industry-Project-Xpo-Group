namespace VectorEmbeddingService.Models;

public class ChatRequest
{
    public string Query { get; set; } = string.Empty;
    public int? TopK { get; set; }
    public double? Threshold { get; set; }
} 