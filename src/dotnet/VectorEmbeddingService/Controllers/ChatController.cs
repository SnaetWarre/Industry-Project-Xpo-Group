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
    private static readonly ConcurrentDictionary<string, List<DateTime>> _rateLimiter = new();
    private static readonly int MaxRequests = int.TryParse(Environment.GetEnvironmentVariable("RATE_LIMIT_MAX_REQUESTS"), out var mr) ? mr : 1;
    private static readonly int TimeWindowSeconds = int.TryParse(Environment.GetEnvironmentVariable("RATE_LIMIT_WINDOW_SECONDS"), out var tw) ? tw : 3;
    private const string SessionCookieName = "chatbotSessionId";
    private static readonly Random _random = new();
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
    // Cache for master exhibitor/participant list documents by website (URL as key)
    private static readonly ConcurrentDictionary<string, EventDocument?> _forcedListCache = new();

    // Store conversation history per session
    private static readonly ConcurrentDictionary<string, List<ChatMessage>> _conversationHistory = new();

    // LRU cache for extra queried event documents (context docs), max 20 entries
    private static readonly ConcurrentDictionary<string, EventDocument> _contextDocCache = new();
    private static readonly LinkedList<string> _contextDocLru = new();
    private static readonly object _contextDocLock = new();
    private const int ContextDocCacheMaxSize = 20;

    private static readonly ConcurrentDictionary<string, (int Count, DateTime Date)> _userDailyCounts = new();
    private static (int Count, DateTime Date) _globalDailyCount = (0, DateTime.UtcNow.Date);
    private static readonly int MaxUserRequestsPerDay = int.TryParse(Environment.GetEnvironmentVariable("RATE_LIMIT_MAX_USER_PER_DAY"), out var mud) ? mud : 20;
    private static readonly int MaxGlobalRequestsPerDay = int.TryParse(Environment.GetEnvironmentVariable("RATE_LIMIT_MAX_GLOBAL_PER_DAY"), out var mgd) ? mgd : 2000;

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

        _logger.LogInformation($"[RateLimit] MaxUserRequestsPerDay: {MaxUserRequestsPerDay}");
    }

    private bool IsUserRateLimitExceeded(string sessionId)
    {
        var today = DateTime.UtcNow.Date;
        var entry = _userDailyCounts.GetOrAdd(sessionId, (0, today));
        if (entry.Date != today)
        {
            _logger.LogInformation($"[RateLimit] Resetting daily count for session {sessionId} (new day). Setting count to 1.");
            _userDailyCounts[sessionId] = (1, today);
            return false;
        }
        _logger.LogInformation($"[RateLimit] Session: {sessionId}, CurrentCount: {entry.Count}, MaxUserRequestsPerDay: {MaxUserRequestsPerDay}");
        if (entry.Count >= MaxUserRequestsPerDay)
        {
            _logger.LogWarning($"[RateLimit] User rate limit exceeded for session {sessionId} (count: {entry.Count}, max: {MaxUserRequestsPerDay})");
            return true;
        }
        _userDailyCounts[sessionId] = (entry.Count + 1, today);
        _logger.LogInformation($"[RateLimit] Incremented count for session {sessionId} to {entry.Count + 1}");
        return false;
    }

    private bool IsGlobalRateLimitExceeded()
    {
        var today = DateTime.UtcNow.Date;
        if (_globalDailyCount.Date != today)
        {
            _globalDailyCount = (1, today);
            return false;
        }
        if (_globalDailyCount.Count >= MaxGlobalRequestsPerDay)
        {
            _logger.LogWarning($"Global chat rate limit exceeded");
            return true;
        }
        _globalDailyCount = (_globalDailyCount.Count + 1, today);
        return false;
    }

    [HttpPost]
    public async Task<ActionResult<object>> Chat([FromBody] ChatRequest request)
    {

        string? sessionId = null;
        if (Request.Cookies.ContainsKey(SessionCookieName))
        {
            sessionId = Request.Cookies[SessionCookieName];
        }
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            sessionId = Guid.NewGuid().ToString("N") + _random.Next(1000, 9999);
            Response.Cookies.Append(SessionCookieName, sessionId, new CookieOptions
            {
                HttpOnly = true,
                Secure = false,
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });
        }


        if (IsUserRateLimitExceeded(sessionId))
            return StatusCode(429, "User daily chat limit reached");
        if (IsGlobalRateLimitExceeded())
            return StatusCode(429, "Global daily chat limit reached");
        if (!IsSessionRateLimitAllowed(sessionId))
            return StatusCode(429, "Too many requests. Please try again later.");
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


            // Sanitize input
            var sanitizedInput = SanitizeInput(request.Query);
            if (string.IsNullOrWhiteSpace(sanitizedInput))
                return BadRequest("Invalid input after sanitization");

            // Get or initialize conversation history for this session
            if (!_conversationHistory.TryGetValue(sessionId, out var history))
            {
                history = new List<ChatMessage>();
                _conversationHistory[sessionId] = history;
            }

            // --- Conversational entity tracking: augment query if follow-up reference ---
            if (IsFollowUpReference(sanitizedInput) && _lastMentionedEntity.TryGetValue(sessionId, out var lastEntity) && !string.IsNullOrWhiteSpace(lastEntity))
            {
                // If the last entity is a stand number, resolve it to a company name and use it for this turn
                if (Regex.IsMatch(lastEntity, @"^\d{1,4}$"))
                {
                    var allEvents = await cosmosService.GetAllEventsAsync();
                    var eventByStand = allEvents.FirstOrDefault(ev => ev.StandNumbers != null && ev.StandNumbers.Any(sn => sn == lastEntity));
                    if (eventByStand != null && !string.IsNullOrWhiteSpace(eventByStand.Title))
                    {
                        lastEntity = eventByStand.Title;
                        _lastMentionedEntity[sessionId] = lastEntity;
                        _logger.LogInformation($"Resolved stand number to company: {lastEntity}");
                    }
                }
                sanitizedInput = lastEntity + " " + sanitizedInput;
                _logger.LogInformation($"Augmented follow-up query with last entity: {sanitizedInput}");
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

            // --- Direct stand number lookup before vector search ---
            string standNumber = ExtractStandNumberFromQuery(sanitizedInput);
            EventDocument? directStandMatch = null;
            List<EventDocument> similarEvents;
            var forcedUrl = website switch
            {
                "ffd" => "https://www.flandersflooringdays.com/en/discover-the-event/participants-2025/",
                "artisan" => "https://www.artisan-xpo.be/en/discover-the-event/list-of-exhibitors/",
                "abiss" => "", // Abiss has no exhibitor list
                _ => "https://www.flandersflooringdays.com/en/discover-the-event/participants-2025/"
            };
            if (!string.IsNullOrEmpty(standNumber))
            {
                var allEvents = await cosmosService.GetAllEventsAsync();
                directStandMatch = allEvents.FirstOrDefault(ev => ev.StandNumbers != null && ev.StandNumbers.Any(sn => sn == standNumber));
                if (directStandMatch != null)
                {
                    var vectorEvents = await cosmosService.SearchSimilarEventsAsync(await _embeddingService.GetEmbeddingAsync(sanitizedInput), request.TopK ?? 5, request.Threshold ?? 0.5);
                    similarEvents = new List<EventDocument> { directStandMatch };
                    similarEvents.AddRange(vectorEvents.Where(ev => ev.Id != directStandMatch.Id));
                    // Always set last mentioned entity to company name, not stand number, before any follow-up
                    _lastMentionedEntity[sessionId] = directStandMatch.Title;
                    _logger.LogInformation($"Direct stand number match found: {directStandMatch.Title} for stand {standNumber}");
                }
                else
                {
                    var queryEmbedding = await _embeddingService.GetEmbeddingAsync(sanitizedInput);
                    similarEvents = await cosmosService.SearchSimilarEventsAsync(queryEmbedding, request.TopK ?? 5, request.Threshold ?? 0.5);
                }
            }
            else
            {
                var queryEmbedding = await _embeddingService.GetEmbeddingAsync(sanitizedInput);
                similarEvents = await cosmosService.SearchSimilarEventsAsync(queryEmbedding, request.TopK ?? 5, request.Threshold ?? 0.5);
            }

            // Always fetch and include the forced/master document if URL is set
            if (!string.IsNullOrEmpty(forcedUrl))
            {
                if (!_forcedListCache.TryGetValue(forcedUrl, out var forcedDoc))
                {
                    forcedDoc = await cosmosService.GetEventByUrlAsync(forcedUrl);
                    _forcedListCache[forcedUrl] = forcedDoc;
                }
                if (forcedDoc != null && !similarEvents.Any(e => e.Url == forcedDoc.Url))
                {
                    similarEvents.Insert(0, forcedDoc);
                    _logger.LogInformation($"Forced/master document added to LLM context: Title: {forcedDoc.Title}, Url: {forcedDoc.Url}");
                }
                else if (forcedDoc == null)
                {
                    _logger.LogWarning($"Forced/master document not found in CosmosDB for URL: {forcedUrl}");
                }
            }

            // Use the full conversation history for context
            var eventsContext = FormatEventsContext(similarEvents);

            // Optionally add last mentioned entity to the LLM prompt
            string lastEntityForPrompt = string.Empty;
            if (_lastMentionedEntity.TryGetValue(sessionId, out var entityForPrompt) && !string.IsNullOrWhiteSpace(entityForPrompt))
            {
                lastEntityForPrompt = $"Last mentioned entity: {entityForPrompt}\n";
            }

            // Construct the enhanced input for the LLM with full conversation history and forced URLs
            var enhancedInput = $"{(lastEntityForPrompt ?? string.Empty)}Conversation History:\n{conversationContext}\n\nRelevant Event Information:\n{eventsContext}\n\nForced URLs:\n{forcedUrl}\n\n---\n\nUser's Question: {sanitizedInput}";

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

            // --- Conversational entity tracking: extract and store last mentioned entity ---
            var mainEntity = ExtractMainEntityFromLlmAnswer(llmAnswer);
            if (string.IsNullOrWhiteSpace(mainEntity))
            {
                mainEntity = ExtractMainEntityFromEvents(similarEvents ?? new List<EventDocument>());
            }
            if (!string.IsNullOrWhiteSpace(mainEntity))
            {
                _lastMentionedEntity[sessionId] = mainEntity;
                _logger.LogInformation($"Updated last mentioned entity for session {sessionId}: {mainEntity}");
            }

            // --- Direct company link logic ---
            // If the user asks for a direct link to the company, try to find and return it
            if (IsDirectCompanyLinkRequest(sanitizedInput) && !string.IsNullOrWhiteSpace(mainEntity))
            {
                var directEvent = (similarEvents ?? new List<EventDocument>()).FirstOrDefault(e => !string.IsNullOrWhiteSpace(e?.Title) && e.Title!.ToLower().Contains(mainEntity.ToLower()));
                if (directEvent != null)
                {
                    var directUrl = GetDirectCompanyUrl(directEvent);
                    if (!string.IsNullOrWhiteSpace(directUrl))
                    {
                        return Ok(new { response = $"De rechtstreekse link naar **{mainEntity}** is: {directUrl}" });
                    }
                }
            }

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

    private bool IsSessionRateLimitAllowed(string sessionId)
    {
        var now = DateTime.UtcNow;
        var windowStart = now.AddSeconds(-TimeWindowSeconds);
        if (!_rateLimiter.TryGetValue(sessionId, out var requests))
        {
            requests = new List<DateTime>();
            _rateLimiter[sessionId] = requests;
        }
        requests.RemoveAll(r => r < windowStart);
        _logger.LogInformation($"[RateLimit] Session: {sessionId}, Requests in window: {requests.Count}, Now: {now:O}, WindowStart: {windowStart:O}, Timestamps: [{string.Join(", ", requests.Select(r => r.ToString("O")))}]");
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
            // Try to get the freshest version from the LRU cache
            lock (_contextDocLock)
            {
                if (!string.IsNullOrEmpty(eventDoc.Id) && _contextDocCache.TryGetValue(eventDoc.Id, out var cachedDoc))
                {
                    eventDoc = cachedDoc;
                    // Move to most recent in LRU
                    _contextDocLru.Remove(eventDoc.Id);
                    _contextDocLru.AddLast(eventDoc.Id);
                }
            }
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

    // Helper: Detect if the query is a follow-up reference (e.g., 'deze deelnemer', 'deze exposant', etc.)
    private bool IsFollowUpReference(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return false;
        var followUpPhrases = new[]
        {
            // English
            "this participant", "this exhibitor", "this company", "this brand", "this booth", "this stand",
            // Dutch
            "deze deelnemer", "deze exposant", "deze stand", "deze participant", "deze company", "deze firma",
            "deze exhibitor", "deze brand", "deze organisatie", "deze booth", "deze firma", "deze onderneming",
            // French
            "ce participant", "cet exposant", "cette entreprise", "cette marque", "ce stand", "cette firme",
            // German
            "dieser teilnehmer", "dieser aussteller", "diese firma", "diese marke", "dieser stand", "dieses unternehmen"
        };
        var lower = query.ToLowerInvariant();
        return followUpPhrases.Any(phrase => lower.Contains(phrase));
    }

    // Helper: Extract the main entity (company/exhibitor name) from the top relevant event
    private string ExtractMainEntityFromEvents(List<EventDocument>? events)
    {
        if (events == null || events.Count == 0) return string.Empty;
        var top = events[0];
        if (!string.IsNullOrWhiteSpace(top?.Title) && top.Title!.Length < 100)
            return top.Title;
        if (events.Count > 1 && !string.IsNullOrWhiteSpace(events[1]?.Title) && events[1]!.Title!.Length < 100)
            return events[1]!.Title;
        return string.Empty;
    }

    // Helper: Extract the main entity (company/exhibitor name) from the LLM answer's first bolded text (**...**)
    private string ExtractMainEntityFromLlmAnswer(string? llmAnswer)
    {
        if (string.IsNullOrWhiteSpace(llmAnswer)) return string.Empty;
        var match = Regex.Match(llmAnswer, @"\*\*(.*?)\*\*");
        if (match.Success && !string.IsNullOrWhiteSpace(match.Groups[1].Value))
            return match.Groups[1].Value.Trim();
        return string.Empty;
    }

    // Helper: Detect if the query is a direct company link request
    private bool IsDirectCompanyLinkRequest(string? query)
    {
        if (string.IsNullOrWhiteSpace(query)) return false;
        var phrases = new[]
        {
            "directe link", "rechtstreekse link", "website van", "company website", "direct link", "eigen website", "site van", "link van het bedrijf", "link van de firma", "link naar de firma", "link naar het bedrijf"
        };
        var lower = query.ToLowerInvariant();
        return phrases.Any(phrase => lower.Contains(phrase));
    }

    // Helper: Get the best direct company URL from an event document
    private string? GetDirectCompanyUrl(EventDocument? eventDoc)
    {
        if (eventDoc == null) return null;
        if (!string.IsNullOrWhiteSpace(eventDoc.Url) && !(eventDoc.Url.Contains("flandersflooringdays.com") || eventDoc.Url.Contains("artisan-xpo.be") || eventDoc.Url.Contains("abissummit")))
        {
            return eventDoc.Url;
        }
        if (eventDoc.SocialMediaLinks != null)
        {
            foreach (var link in eventDoc.SocialMediaLinks)
            {
                if (!string.IsNullOrWhiteSpace(link) && (link.Contains(".com") || link.Contains(".be") || link.Contains(".nl")) && !(link.Contains("flandersflooringdays.com") || link.Contains("artisan-xpo.be") || link.Contains("abissummit")))
                {
                    return link;
                }
            }
        }
        return null;
    }

    // Helper: Extract stand/booth number from the query (e.g., 'stand 142', 'booth 142')
    private string ExtractStandNumberFromQuery(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return string.Empty;
        // Regex: look for 'stand' or 'booth' followed by a number (1-4 digits)
        var match = Regex.Match(query, @"\b(?:stand|booth)\s*[:#]??\s*(\d{1,4})", RegexOptions.IgnoreCase);
        if (match.Success && !string.IsNullOrWhiteSpace(match.Groups[1].Value))
            return match.Groups[1].Value.Trim();
        return string.Empty;
    }

    [HttpGet("demo-ratelimit")]
    public ActionResult<object> DemoRateLimit()
    {
        // --- Session ID via Cookie ---
        string? sessionId = null;
        if (Request.Cookies.ContainsKey(SessionCookieName))
        {
            sessionId = Request.Cookies[SessionCookieName];
        }
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            sessionId = Guid.NewGuid().ToString("N") + _random.Next(1000, 9999);
            Response.Cookies.Append(SessionCookieName, sessionId, new CookieOptions
            {
                HttpOnly = true,
                Secure = false,
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });
        }
        // --- End Session ID via Cookie ---

        _logger.LogInformation($"[DemoRateLimit] Session: {sessionId}, Cookies: {string.Join(", ", Request.Cookies.Select(kvp => kvp.Key + "=" + kvp.Value))}");

        if (IsUserRateLimitExceeded(sessionId))
            return StatusCode(429, new { error = "User daily chat limit reached" });
        if (IsGlobalRateLimitExceeded())
            return StatusCode(429, new { error = "Global daily chat limit reached" });
        if (!IsSessionRateLimitAllowed(sessionId))
            return StatusCode(429, new { error = "Too many requests. Please try again later." });

        // Count requests in the current minute window
        var now = DateTime.UtcNow;
        var windowStart = now.AddSeconds(-TimeWindowSeconds);
        if (!_rateLimiter.TryGetValue(sessionId, out var requests))
        {
            requests = new List<DateTime>();
            _rateLimiter[sessionId] = requests;
        }
        requests.RemoveAll(r => r < windowStart);
        int requestsThisMinute = requests.Count;

        _logger.LogInformation($"[DemoRateLimit] Session: {sessionId}, RequestsThisWindow: {requestsThisMinute}, Now: {now:O}, WindowStart: {windowStart:O}, Timestamps: [{string.Join(", ", requests.Select(r => r.ToString("O")))}]");

        return Ok(new
        {
            message = "Demo rate limit endpoint: request accepted.",
            requestsThisWindow = requestsThisMinute,
            perWindowLimit = MaxRequests,
            windowSeconds = TimeWindowSeconds,
            perDayLimit = MaxUserRequestsPerDay
        });
    }
}
