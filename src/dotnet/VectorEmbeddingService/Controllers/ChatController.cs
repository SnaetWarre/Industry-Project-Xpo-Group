using Microsoft.AspNetCore.Mvc;
using VectorEmbeddingService.Models;
using VectorEmbeddingService.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Azure.AI.OpenAI;
using Azure;
using System.Text.RegularExpressions;
using System.Collections.Concurrent;
using System.Text;

namespace VectorEmbeddingService.Controllers;

[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly CosmosClient _cosmosClient;
    private readonly ILoggerFactory _loggerFactory;
    private readonly IEmbeddingService _embeddingService;
    private readonly ILogger<ChatController> _logger;
    private readonly OpenAIClient _openAIClient;
    private readonly string _deploymentName;
    private readonly ConcurrentDictionary<string, List<DateTime>> _rateLimiter = new();
    private const int MaxRequests = 60;
    private const int TimeWindowSeconds = 60;
    private readonly HashSet<string> _stopWords = new()
    {
        "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours",
        "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself",
        "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom",
        "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but",
        "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about",
        "against", "between", "into", "through", "during", "before", "after", "above", "below", "to",
        "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then",
        "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few",
        "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
        "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "tell", "me", "about",
        "like", "events", "event", "find", "show", "what's", "whats", "looking", "interested",
        "hey", "hi", "hello", "there"
    };

    // Simple conversation memory: last mentioned entity per IP
    private static readonly ConcurrentDictionary<string, string> _lastMentionedEntity = new();

    // Synonym map for keyword normalization
    private static readonly Dictionary<string, string> _keywordSynonyms = new()
    {
        { "stand", "stand" },
        { "booth", "stand" },
        { "booth number", "stand" },
        { "stand number", "stand" }
    };

    // Single, neutral system prompt
    private const string SystemPrompt = "You are a helpful assistant for Kortrijk Xpo events. For booth or stand numbers on Flanders Flooring Days, consult the Participants list at https://www.flandersflooringdays.com/en/discover-the-event/participants-2025/. For Artisan Expo, consult the List of Exhibitors at https://www.artisan-xpo.be/en/discover-the-event/list-of-exhibitors/. Abiss has no exhibitor list. Use the 'standNumbers' field in the event context as your source of booth data. Use provided event information as your primary source; you may use general knowledge sparingly. Respond in the same language as the user's question.";

    // Store last LLM answer per IP for follow-up context
    private static readonly ConcurrentDictionary<string, string> _lastLlmAnswer = new();

    public ChatController(
        CosmosClient cosmosClient,
        IEmbeddingService embeddingService,
        ILogger<ChatController> logger,
        ILoggerFactory loggerFactory,
        IConfiguration configuration)
    {
        _cosmosClient = cosmosClient;
        _embeddingService = embeddingService;
        _logger = logger;
        _loggerFactory = loggerFactory;

        // Initialize Azure OpenAI client for chat
        var chatEndpoint = configuration["AzureOpenAIChat:Endpoint"] ?? throw new ArgumentNullException("AzureOpenAIChat:Endpoint");
        var chatApiKey = configuration["AzureOpenAIChat:ApiKey"] ?? throw new ArgumentNullException("AzureOpenAIChat:ApiKey");
        _deploymentName = configuration["AzureOpenAIChat:ChatDeploymentName"] ?? throw new ArgumentNullException("AzureOpenAIChat:ChatDeploymentName");
        _openAIClient = new OpenAIClient(new Uri(chatEndpoint), new AzureKeyCredential(chatApiKey));
    }

    [HttpPost]
    public async Task<ActionResult<object>> Chat([FromBody] ChatRequest request)
    {
        _logger.LogInformation("Chat endpoint hit");
        try
        {
            if (string.IsNullOrWhiteSpace(request.Query))
                return BadRequest("Query cannot be empty");

            // Choose the correct Cosmos container based on requested website
            var website = string.IsNullOrWhiteSpace(request.Website) ? "ffd" : request.Website;
            _logger.LogInformation("Using website container: {Website}", website);
            var databaseName = "XpoData";
            var cosmosLogger = _loggerFactory.CreateLogger<CosmosDbService>();
            var cosmosService = new CosmosDbService(_cosmosClient, _embeddingService, databaseName, website, cosmosLogger);

            // Get client IP for rate limiting
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            if (!IsRateLimitAllowed(ipAddress))
                return StatusCode(429, "Too many requests. Please try again later.");

            // Sanitize input
            var sanitizedInput = SanitizeInput(request.Query);
            if (string.IsNullOrWhiteSpace(sanitizedInput))
                return BadRequest("Invalid input after sanitization");

            // Use the full sanitized user query for embedding/vector search
            var queryEmbedding = await _embeddingService.GetEmbeddingAsync(sanitizedInput);
            var similarEvents = await cosmosService.SearchSimilarEventsAsync(queryEmbedding, request.TopK ?? 5, request.Threshold ?? 0.5);

            // Use keyword extraction only for direct matching (stand/booth/company)
            var keywords = ExtractKeywords(sanitizedInput);
            _logger.LogInformation("Extracted keywords: {Keywords}", string.Join(", ", keywords));

            // Direct match logic: robust stand/booth/stande/booth number matching
            string normalizedInput = sanitizedInput.ToLower();
            EventDocument? directMatch = null;
            // Synonyms for stand/booth
            var standSynonyms = new[] { "stand", "booth", "stand number", "booth number", "stande" };
            // If the input contains any stand/booth synonym, extract all numbers
            bool containsStandSynonym = standSynonyms.Any(syn => normalizedInput.Contains(syn));
            List<string> numbersInQuery = new();
            if (containsStandSynonym)
            {
                numbersInQuery = Regex.Matches(normalizedInput, @"\b\d{1,5}\b").Select(m => m.Value).ToList();
            }
            foreach (var evt in similarEvents)
            {
                if (!string.IsNullOrEmpty(evt.Title) && normalizedInput.Contains(evt.Title.ToLower()))
                {
                    directMatch = evt;
                    break;
                }
                if (containsStandSynonym && evt.StandNumbers != null && evt.StandNumbers.Any(sn => numbersInQuery.Contains(sn)))
                {
                    directMatch = evt;
                    break;
                }
            }
            // Fallback: search all string fields for 'stand 142', 'booth 142', etc. if no direct match
            if (directMatch == null && containsStandSynonym && numbersInQuery.Any())
            {
                foreach (var evt in similarEvents)
                {
                    var allFields = new[] { evt.Title, evt.Description, evt.RawTextContent };
                    foreach (var num in numbersInQuery)
                    {
                        foreach (var syn in standSynonyms)
                        {
                            var pattern = $"{syn} {num}";
                            if (allFields.Any(f => !string.IsNullOrEmpty(f) && f.ToLower().Contains(pattern)))
                            {
                                directMatch = evt;
                                break;
                            }
                        }
                        if (directMatch != null) break;
                    }
                    if (directMatch != null) break;
                }
            }

            // For follow-up questions, always use the last matched event as context and prepend the last LLM answer if available
            bool isFollowUp = normalizedInput.Contains("that company") || normalizedInput.Contains("that stand") || normalizedInput.Contains("that booth");
            List<EventDocument> contextEvents = new();
            string lastLlmContext = string.Empty;
            string? lastCompanyName = null;
            if (isFollowUp && _lastMentionedEntity.TryGetValue(ipAddress, out var lastEntity))
            {
                lastCompanyName = lastEntity;
                // Search all similar events for the last company name (case-insensitive, partial match allowed)
                var lastEvent = similarEvents.FirstOrDefault(e => !string.IsNullOrEmpty(e.Title) && e.Title.ToLower().Contains(lastCompanyName.ToLower()));
                if (lastEvent != null)
                {
                    contextEvents.Add(lastEvent);
                }
                // Prepend last LLM answer if available
                if (_lastLlmAnswer.TryGetValue(ipAddress, out var lastLlm))
                {
                    lastLlmContext = $"Previous Bot Answer:\n{lastLlm}\n\n";
                }
            }
            else if (directMatch != null)
            {
                // If direct match is a company, use that event as context for all follow-ups
                contextEvents.Add(directMatch);
                lastCompanyName = directMatch.Title;
            }
            else
            {
                contextEvents = similarEvents;
            }

            // If the user asks for more about a company, and we have a last company name, search all similar events for that company and use it as context
            if (isFollowUp && string.IsNullOrEmpty(lastCompanyName) && _lastLlmAnswer.TryGetValue(ipAddress, out var lastLlmAnswer))
            {
                // Try to extract a company name from the last LLM answer (simple heuristic: look for capitalized words)
                var match = Regex.Match(lastLlmAnswer, @"([A-Z][A-Za-z0-9\- ]{2,})");
                if (match.Success)
                {
                    lastCompanyName = match.Groups[1].Value;
                    var lastEvent = similarEvents.FirstOrDefault(e => !string.IsNullOrEmpty(e.Title) && e.Title.ToLower().Contains(lastCompanyName.ToLower()));
                    if (lastEvent != null)
                    {
                        contextEvents = new List<EventDocument> { lastEvent };
                    }
                }
            }

            // --- Update memory: store last mentioned company/entity if found ---
            if (contextEvents.Any())
            {
                var firstEvent = contextEvents.First();
                if (!string.IsNullOrWhiteSpace(firstEvent.Title))
                {
                    _lastMentionedEntity[ipAddress] = firstEvent.Title;
                }
            }

            // Format events for context
            var eventsContext = FormatEventsContext(contextEvents);

            // Log the actual context sent to the LLM for debugging
            _logger.LogInformation("LLM context: {Context}", eventsContext);

            // Construct the enhanced input for the LLM
            var enhancedInput = $"{lastLlmContext}Relevant Event Information:\n{eventsContext}\n\n---\n\nUser's Question: {sanitizedInput}";

            // Get response from Azure OpenAI
            var chatCompletionsOptions = new ChatCompletionsOptions
            {
                DeploymentName = _deploymentName,
                Messages =
                {
                    new ChatRequestSystemMessage(SystemPrompt),
                    new ChatRequestUserMessage(enhancedInput)
                },
                MaxTokens = 2048,
                Temperature = 0.2f
            };

            var response = await _openAIClient.GetChatCompletionsAsync(chatCompletionsOptions);
            var llmAnswer = response.Value.Choices[0].Message.Content.Trim();
            // Store last LLM answer for follow-up context
            _lastLlmAnswer[ipAddress] = llmAnswer;
            return Ok(new { response = llmAnswer });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat request");
            return StatusCode(500, "An error occurred while processing your request.");
        }
    }

    private bool IsRateLimitAllowed(string ipAddress)
    {
        var now = DateTime.UtcNow;
        var windowStart = now.AddSeconds(-TimeWindowSeconds);

        if (!_rateLimiter.TryGetValue(ipAddress, out var requests))
        {
            requests = new List<DateTime>();
            _rateLimiter[ipAddress] = requests;
        }

        // Remove old requests
        requests.RemoveAll(r => r < windowStart);

        if (requests.Count >= MaxRequests)
            return false;

        requests.Add(now);
        return true;
    }

    private string SanitizeInput(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        // Remove script tags
        text = Regex.Replace(text, "<script.*?>.*?</script>", "", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        
        // Remove SQL injection patterns
        text = Regex.Replace(text, @"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|--)\b)", "", RegexOptions.IgnoreCase);
        
        // HTML encode the text
        text = System.Web.HttpUtility.HtmlEncode(text);
        
        // Limit length
        return text.Length > 1000 ? text.Substring(0, 1000) : text;
    }

    private List<string> ExtractKeywords(string input)
    {
        var words = Regex.Matches(input.ToLower(), @"\b\w+\b")
            .Cast<Match>()
            .Select(m => m.Value)
            .Where(w => !_stopWords.Contains(w) && w.Length > 2)
            .Select(w => _keywordSynonyms.ContainsKey(w) ? _keywordSynonyms[w] : w)
            .Distinct()
            .ToList();

        // Special handling for 'stand', 'booth', 'booth number', etc.
        if (input.ToLower().Contains("booth number")) words.Add("stand");
        if (input.ToLower().Contains("stand number")) words.Add("stand");
        return words;
    }

    private string FormatEventsContext(List<EventDocument> events)
    {
        if (!events.Any())
            return "No specific events found matching your query in the available data.";

        var contextParts = new List<string>();
        var numEventsToShow = Math.Min(3, events.Count);

        for (int i = 0; i < numEventsToShow; i++)
        {
            var eventDoc = events[i];
            var title = eventDoc.Title;
            var url = eventDoc.Url;
            var description = eventDoc.Description;
            var socialLinks = string.Join(", ", eventDoc.SocialMediaLinks);
            var standNumbers = string.Join(", ", eventDoc.StandNumbers);
            var sourceType = eventDoc.SourceType;
            var rawText = eventDoc.RawTextContent;

            var eventDetail = $"Event Title: {title}\nURL: {url}\nDescription: {description}\nStand Number(s): {standNumbers}\nSocial Links: {socialLinks}\nSource Type: {sourceType}";
            if (!string.IsNullOrEmpty(rawText))
                eventDetail += $"\nRelevant Content: {rawText}";

            contextParts.Add(eventDetail);
        }

        var context = string.Join("\n\n---\n\n", contextParts);

        if (events.Count > numEventsToShow)
            context += $"\n\n---\n\nNote: There are {events.Count - numEventsToShow} more potentially matching events. You can ask for more details or refine your search.";

        return context;
    }
} 