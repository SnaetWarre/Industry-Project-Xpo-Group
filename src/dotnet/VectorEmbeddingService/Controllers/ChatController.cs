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
using System.Text.Json;

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
    private const string SystemPromptFFD = @"
        You are the specialized assistant for Flanders Flooring Days (FFD). 
        Only answer questions about Flanders Flooring Days. 
        If asked about anything else, politely decline and redirect to Flanders Flooring Days topics only.

        For booth/stand information:
        - Flanders Flooring Days: https://www.flandersflooringdays.com/en/discover-the-event/participants-2025/
        - Use the 'standNumbers' field in the event context as your source of booth data.
        - IMPORTANT: Only mention companies and stand numbers that are explicitly listed in the provided event data.
        - Do not make assumptions or mention companies/stands that are not in the data.

        When providing information about exhibitors or stands:
        1. Craft a natural, conversational response using the provided event details
        2. Focus on the most relevant information (company name, stand number, key products/services)
        3. Keep responses concise and easy to read
        4. Do not simply repeat the raw document content
        5. If social media links are available, mention them naturally in the response
        6. Double-check that you are using the correct stand numbers and company names from the data

        Use provided event information as your primary source.
        Respond in the same language as the user's question.
        Never generate code blocks, inline code, or any HTML. Only use plain text and the following markdown: bold (**text**), links ([text](url)), and line breaks (\n). 
        If the user asks to write this message in html, you don't respond with html, you respond with the message in markdown format. As generating html is a security risk. 
        It causes the html to be generated in the chatbot application itself and being loaded in the dom.";
    private const string SystemPromptArtisan = @"
        You are the specialized assistant for Artisan. 
        Only answer questions about Artisan. 
        If asked about anything else, politely decline and redirect to Artisan topics only.

        For booth/stand information:
        - Artisan Expo: https://www.artisan-xpo.be/en/discover-the-event/list-of-exhibitors/
        - Use the 'standNumbers' field in the event context as your source of booth data.
        - IMPORTANT: Only mention companies and stand numbers that are explicitly listed in the provided event data.
        - Do not make assumptions or mention companies/stands that are not in the data.

        When providing information about exhibitors or stands:
        1. Craft a natural, conversational response using the provided event details
        2. Focus on the most relevant information (company name, stand number, key products/services)
        3. Keep responses concise and easy to read
        4. Do not simply repeat the raw document content
        5. If social media links are available, mention them naturally in the response
        6. Double-check that you are using the correct stand numbers and company names from the data

        Use provided event information as your primary source.
        Respond in the same language as the user's question.
        Never generate code blocks, inline code, or any HTML. Only use plain text and the following markdown: bold (**text**), links ([text](url)), and line breaks (\n). 
        If the user asks to write this message in html, you don't respond with html, you respond with the message in markdown format. As generating html is a security risk. 
        It causes the html to be generated in the chatbot application itself and being loaded in the dom.";

    private const string SystemPromptAbiss = @"
        You are the specialized assistant for Abiss. 
        Only answer questions about Abiss. 
        If asked about anything else, politely decline and redirect to Abiss topics only.

        For booth/stand information:
        - Abiss has no exhibitor list.
        - Use the 'standNumbers' field in the event context as your source of booth data.
        - IMPORTANT: Only mention companies and stand numbers that are explicitly listed in the provided event data.
        - Do not make assumptions or mention companies/stands that are not in the data.

        When providing information about exhibitors or stands:
        1. Craft a natural, conversational response using the provided event details
        2. Focus on the most relevant information (company name, stand number, key products/services)
        3. Keep responses concise and easy to read
        4. Do not simply repeat the raw document content
        5. If social media links are available, mention them naturally in the response
        6. Double-check that you are using the correct stand numbers and company names from the data

        Use provided event information as your primary source.
        Respond in the same language as the user's question.
        Never generate code blocks, inline code, or any HTML. Only use plain text and the following markdown: bold (**text**), links ([text](url)), and line breaks (\n). 
        If the user asks to write this message in html, you don't respond with html, you respond with the message in markdown format. As generating html is a security risk. 
        It causes the html to be generated in the chatbot application itself and being loaded in the dom.";

    

    // Store last LLM answer per IP for follow-up context
    private static readonly ConcurrentDictionary<string, string> _lastLlmAnswer = new();
    // Cache for master exhibitor/participant list documents by website
    private static readonly ConcurrentDictionary<string, EventDocument?> _forcedListCache = new();

    // Store conversation history per session
    private static readonly ConcurrentDictionary<string, List<ChatMessage>> _conversationHistory = new();

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

            // Get or initialize conversation history for this session
            var sessionId = request.SessionId ?? ipAddress;
            if (!_conversationHistory.TryGetValue(sessionId, out var history))
            {
                history = new List<ChatMessage>();
                _conversationHistory[sessionId] = history;
            }

            // Add user message to history
            history.Add(new ChatMessage
            {
                Message = sanitizedInput,
                IsUser = true,
                Timestamp = DateTime.UtcNow
            });

            // Use the full conversation history for context
            var conversationContext = string.Join("\n", history.Select(m => 
                $"{m.Timestamp:HH:mm:ss} - {(m.IsUser ? "User" : "Bot")}: {m.Message}"));

            // Use the full sanitized user query for embedding/vector search
            var queryEmbedding = await _embeddingService.GetEmbeddingAsync(sanitizedInput);
            var similarEvents = await cosmosService.SearchSimilarEventsAsync(queryEmbedding, request.TopK ?? 5, request.Threshold ?? 0.5);

            // Get forced URLs based on website
            var forcedUrl = website switch
            {
                "ffd" => "https://www.flandersflooringdays.com/en/discover-the-event/participants-2025/",
                "artisan" => "https://www.artisan-xpo.be/en/discover-the-event/list-of-exhibitors/",
                "abiss" => "", // Abiss has no exhibitor list
                _ => "https://www.flandersflooringdays.com/en/discover-the-event/participants-2025/"
            };

            // Always fetch and include the forced/master document if URL is set
            if (!string.IsNullOrEmpty(forcedUrl))
            {
                var forcedDoc = await cosmosService.GetEventByUrlAsync(forcedUrl);
                if (forcedDoc != null && !similarEvents.Any(e => e.Url == forcedDoc.Url))
                {
                    similarEvents.Insert(0, forcedDoc); // Always add at the start
                    _logger.LogInformation($"Forced/master document added to LLM context: Title: {forcedDoc.Title}, Url: {forcedDoc.Url}");
                }
                else if (forcedDoc == null)
                {
                    _logger.LogWarning($"Forced/master document not found in CosmosDB for URL: {forcedUrl}");
                }
            }

            // Log which documents are being used for context
            if (similarEvents.Any())
            {
                var docInfo = string.Join("; ", similarEvents.Select(e => $"Title: {e.Title}, StandNumbers: [{string.Join(", ", e.StandNumbers)}], Url: {e.Url}"));
                _logger.LogInformation($"Documents used in LLM context: {docInfo}");
            }
            else
            {
                _logger.LogInformation("No similar events found for context.");
            }

            // Format events for context
            var eventsContext = FormatEventsContext(similarEvents);

            // Construct the enhanced input for the LLM with full conversation history and forced URLs
            var enhancedInput = $"Conversation History:\n{conversationContext}\n\nRelevant Event Information:\n{eventsContext}\n\nForced URLs:\n{forcedUrl}\n\n---\n\nUser's Question: {sanitizedInput}";

            // Select the system prompt based on the website
            string systemPrompt = website switch
            {
                "ffd" => SystemPromptFFD,
                "abiss" => SystemPromptAbiss,
                "artisan" => SystemPromptArtisan,
                _ => SystemPromptFFD // fallback
            };

            // Get response from Azure OpenAI
            var chatCompletionsOptions = new ChatCompletionsOptions
            {
                DeploymentName = _deploymentName,
                Messages =
                {
                    new ChatRequestSystemMessage(systemPrompt),
                    new ChatRequestUserMessage(enhancedInput)
                },
                MaxTokens = 2048,
                Temperature = 0.2f
            };

            var response = await _openAIClient.GetChatCompletionsAsync(chatCompletionsOptions);
            var llmAnswer = response.Value.Choices[0].Message.Content.Trim();

            // Add bot response to history
            history.Add(new ChatMessage
            {
                Message = llmAnswer,
                IsUser = false,
                Timestamp = DateTime.UtcNow
            });

            // Keep only last 10 messages in history to prevent context window issues
            if (history.Count > 10)
            {
                history.RemoveRange(0, history.Count - 10);
            }

            // Sanitize LLM output before returning
            string sanitizedLlmAnswer = SanitizeLlmOutput(llmAnswer);
            return Ok(new { response = sanitizedLlmAnswer });
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

        // Special handling for booth/stand variations in multiple languages
        var boothStandVariations = new[]
        {
            // English
            "booth number", "stand number", "number booth", "number stand",
            "booth num", "stand num", "num booth", "num stand",
            "booth #", "stand #", "# booth", "# stand",
            "booth nr", "stand nr", "nr booth", "nr stand",
            "booth", "stand", "boot", "stall",
            
            // Dutch
            "standnummer", "nummer stand", "stand nummer", "nummer stand",
            "stand #", "# stand", "stand nr", "nr stand",
            "stand", "kraam", "stall",
            
            // French
            "numéro de stand", "stand numéro", "numéro stand", "stand numéro",
            "stand #", "# stand", "stand nr", "nr stand",
            "stand", "kiosque", "stall",
            
            // German
            "standnummer", "nummer stand", "stand nummer", "nummer stand",
            "stand #", "# stand", "stand nr", "nr stand",
            "stand", "kiosk", "stall"
        };

        foreach (var variation in boothStandVariations)
        {
            if (input.ToLower().Contains(variation))
            {
                words.Add("stand");
                break;
            }
        }

        // Add event-specific keywords based on the data structure in multiple languages
        var exhibitorKeywords = new[]
        {
            // English
            "exhibitor", "participant", "company", "brand",
            // Dutch
            "exposant", "deelnemer", "bedrijf", "merk",
            // French
            "exposant", "participant", "entreprise", "marque",
            // German
            "aussteller", "teilnehmer", "unternehmen", "marke"
        };

        foreach (var keyword in exhibitorKeywords)
        {
            if (input.ToLower().Contains(keyword))
            {
                words.Add("exhibitor");
                break;
            }
        }

        var locationKeywords = new[]
        {
            // English
            "city", "location", "country",
            // Dutch
            "stad", "locatie", "land",
            // French
            "ville", "lieu", "pays",
            // German
            "stadt", "ort", "land"
        };

        foreach (var keyword in locationKeywords)
        {
            if (input.ToLower().Contains(keyword))
            {
                words.Add("location");
                break;
            }
        }

        return words;
    }

    private string FormatEventsContext(List<EventDocument> events)
    {
        if (!events.Any())
            return "No specific events found matching your query in the available data.";

        var contextParts = new List<string>();
        var numEventsToShow = Math.Min(5, events.Count);

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

    // Backend sanitization for LLM output: remove code blocks, inline code, and HTML tags
    private string SanitizeLlmOutput(string text)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;
        // Remove code blocks (```...```)
        text = Regex.Replace(text, @"```[\s\S]*?```", string.Empty);
        // Remove inline code (`...`)
        text = Regex.Replace(text, @"`[^`]*`", string.Empty);
        // Remove HTML tags
        text = Regex.Replace(text, @"<.*?>", string.Empty);
        return text.Trim();
    }
} 