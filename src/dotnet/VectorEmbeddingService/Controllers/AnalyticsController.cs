using Microsoft.AspNetCore.Mvc;
using VectorEmbeddingService.Models;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace VectorEmbeddingService.Controllers;

[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly Container _analyticsContainer;
    private readonly Container _userProfilesContainer;
    private readonly ILogger<AnalyticsController> _logger;
    private const int MaxMessagesPerDay = 20;

    public AnalyticsController(CosmosClient cosmosClient, ILogger<AnalyticsController> logger)
    {
        var databaseName = "XpoData";
        _analyticsContainer = cosmosClient.GetContainer(databaseName, "analytics");
        _userProfilesContainer = cosmosClient.GetContainer(databaseName, "userProfiles");
        _logger = logger;
    }

    [HttpPost("event")]
    public async Task<ActionResult> TrackEvent([FromBody] AnalyticsEvent analyticsEvent)
    {
        try
        {
            string? sessionId = analyticsEvent.SessionId ?? GetSessionIdFromRequest();
            if (string.IsNullOrEmpty(sessionId))
                return BadRequest("SessionId is required");

            if (string.IsNullOrEmpty(analyticsEvent.EventType))
                return BadRequest("EventType is required");

            // Look up user profile by sessionId
            var profileQuery = new QueryDefinition("SELECT * FROM c WHERE c.sessionId = @sessionId")
                .WithParameter("@sessionId", sessionId);
            var profileIterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(profileQuery);
            UserProfile? profile = null;
            if (profileIterator.HasMoreResults)
            {
                var profileResults = await profileIterator.ReadNextAsync();
                profile = profileResults.FirstOrDefault();
            }
            if (profile == null)
            {
                _logger.LogWarning("Analytics event received for missing profile. SessionId: {SessionId}, EventType: {EventType}", sessionId, analyticsEvent.EventType);
                return StatusCode(440, new { success = false, error = "SessionInvalid", message = "User profile/session not found. Please re-register." });
            }
            string company = profile.Company ?? "unknown";
            string website = profile.Website ?? "unknown";

            // Do not create analytics documents for unknown websites
            if (website == "unknown")
            {
                _logger.LogInformation("Skipping analytics event for unknown website (session {SessionId})", sessionId);
                return Ok(new { success = true, ignored = true });
            }

            // Calculate week key (ISO 8601 week)
            var now = DateTime.UtcNow;
            var cal = System.Globalization.CultureInfo.InvariantCulture.Calendar;
            int week = cal.GetWeekOfYear(now, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
            string year = now.Year.ToString();
            string weekKey = $"{year}-W{week:D2}_{website}";
            string today = now.ToString("yyyy-MM-dd");

            // Try to get the existing analytics doc for this week/website
            var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @id").WithParameter("@id", weekKey);
            var iterator = _analyticsContainer.GetItemQueryIterator<WeeklyAnalytics>(query);
            WeeklyAnalytics analytics = null!;
            if (iterator.HasMoreResults)
            {
                var results = await iterator.ReadNextAsync();
                analytics = results.FirstOrDefault() ?? null!;
            }
            if (analytics == null)
            {
                analytics = new WeeklyAnalytics
                {
                    Id = weekKey,
                    Year = year,
                    Week = week,
                    Website = website,
                    Days = new Dictionary<string, DailyAnalytics>(),
                    UpdatedAt = now
                };
            }

            // Update daily analytics for today
            if (!analytics.Days.TryGetValue(today, out var daily))
            {
                daily = new DailyAnalytics();
                analytics.Days[today] = daily;
            }

            // Add session to unique sessions
            daily.UniqueSessions.Add(sessionId);

            // Initialize or update session data
            if (!daily.SessionData.TryGetValue(sessionId, out var sessionData))
            {
                // Only create a new sessionData for chat_start, not for registration
                if (analyticsEvent.EventType == "chat_start")
                {
                    sessionData = new SessionData
                    {
                        ChatStartTime = now,
                        Company = company
                    };
                    daily.SessionData[sessionId] = sessionData;
                }
            }

            // Handle registration click event
            if (analyticsEvent.EventType == "registration")
            {
                // Always update company stats, even if chat was not started
                if (!string.IsNullOrEmpty(company))
                {
                    daily.CompanyStats ??= new Dictionary<string, int>();
                    if (!daily.CompanyStats.ContainsKey(company))
                        daily.CompanyStats[company] = 0;
                    daily.CompanyStats[company]++;
                }
                // If you want to track chat-to-registration time, keep the sessionData logic as is
                if (sessionData != null)
                {
                    sessionData.RegistrationClickTime = now;
                    if (sessionData.ChatStartTime != default)
                    {
                        sessionData.ChatToRegistrationSeconds = (now - sessionData.ChatStartTime).TotalSeconds;
                    }
                }
            }

            analytics.UpdatedAt = now;
            await _analyticsContainer.UpsertItemAsync(
                analytics,
                new PartitionKey(analytics.Id)
            );

            _logger.LogInformation(
                "Weekly analytics updated: {Id} (session {SessionId}, company {Company}, website {Website}, day {Day})",
                analytics.Id,
                sessionId,
                company,
                website,
                today
            );
            return Ok(new { success = true, id = analytics.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking analytics event");
            return StatusCode(500, "An error occurred while tracking the event");
        }
    }

    private static Dictionary<string, object> ConvertPayload(Dictionary<string, object> payload)
    {
        if (payload == null)
            return new Dictionary<string, object>();
        var result = new Dictionary<string, object>();
        foreach (var kvp in payload)
        {
            if (kvp.Value is System.Text.Json.JsonElement elem)
            {
                var converted = ConvertJsonElement(elem);
                if (converted != null) result[kvp.Key] = converted;
            }
            else
            {
                result[kvp.Key] = kvp.Value;
            }
        }
        return result;
    }

    private static object? ConvertJsonElement(System.Text.Json.JsonElement elem)
    {
        switch (elem.ValueKind)
        {
            case System.Text.Json.JsonValueKind.String:
                return elem.GetString();
            case System.Text.Json.JsonValueKind.Number:
                if (elem.TryGetInt64(out var l)) return l;
                if (elem.TryGetDouble(out var d)) return d;
                return elem.GetRawText();
            case System.Text.Json.JsonValueKind.True:
            case System.Text.Json.JsonValueKind.False:
                return elem.GetBoolean();
            case System.Text.Json.JsonValueKind.Object:
                var dict = new Dictionary<string, object>();
                foreach (var prop in elem.EnumerateObject())
                {
                    var converted = ConvertJsonElement(prop.Value);
                    if (converted != null) dict[prop.Name] = converted;
                }
                return dict;
            case System.Text.Json.JsonValueKind.Array:
                var list = new List<object>();
                foreach (var item in elem.EnumerateArray())
                {
                    var converted = ConvertJsonElement(item);
                    if (converted != null) list.Add(converted);
                }
                return list;
            case System.Text.Json.JsonValueKind.Null:
            case System.Text.Json.JsonValueKind.Undefined:
                return null;
            default:
                return elem.GetRawText();
        }
    }

    [HttpPost("profile")]
    public async Task<ActionResult> CreateOrUpdateProfile([FromBody] UserProfileRequest request)
    {
        try
        {
            string? sessionId = request.SessionId ?? GetSessionIdFromRequest();
            if (string.IsNullOrEmpty(sessionId))
                return BadRequest("SessionId is required");

            if (string.IsNullOrEmpty(request.Company))
                return BadRequest("Company is required");

            if (string.IsNullOrEmpty(request.JobTitle))
                return BadRequest("JobTitle is required");

            var profile = new UserProfile
            {
                Id = Guid.NewGuid().ToString(),
                SessionId = sessionId,
                Company = request.Company,
                JobTitle = request.JobTitle,
                Website = request.Website,
                ChatHistory = new List<ChatMessage>(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Upsert the profile to CosmosDB
            await _userProfilesContainer.UpsertItemAsync(
                profile,
                new PartitionKey(sessionId)
            );

            _logger.LogInformation(
                "User profile created for session {SessionId}",
                sessionId
            );

            return Ok(new { success = true, id = profile.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user profile");
            return StatusCode(500, "An error occurred while creating the profile");
        }
    }

    [HttpPost("chat")]
    public async Task<ActionResult> TrackChatMessage([FromBody] ChatMessageRequest request)
    {
        try
        {
            string? sessionId = request.SessionId ?? GetSessionIdFromRequest();
            if (string.IsNullOrEmpty(sessionId))
                return BadRequest("SessionId is required");

            if (string.IsNullOrEmpty(request.Message))
                return BadRequest("Message is required");

            // Get user profile
            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.sessionId = @sessionId")
                .WithParameter("@sessionId", sessionId);

            var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(query);
            var results = await iterator.ReadNextAsync();
            var profile = results.FirstOrDefault();

            if (profile == null)
            {
                _logger.LogWarning("Chat event received for missing profile. SessionId: {SessionId}, Message: {Message}", sessionId, request.Message);
                return StatusCode(440, new { success = false, error = "SessionInvalid", message = "User profile/session not found. Please re-register." });
            }

            // Check message limit
            var today = DateTime.UtcNow.Date;
            var messagesToday = profile.ChatHistory
                .Count(m => m.Timestamp.Date == today);

            if (messagesToday >= MaxMessagesPerDay)
            {
                return Ok(new { 
                    success = false, 
                    message = "Message limit reached",
                    shouldShowRegistration = true
                });
            }

            // Create chat message with server-generated timestamp
            var chatMessage = new ChatMessage
            {
                Timestamp = DateTime.UtcNow,
                Message = request.Message,
                IsUser = request.IsUser
            };

            // Add message to chat history
            profile.ChatHistory.Add(chatMessage);
            profile.UpdatedAt = DateTime.UtcNow;

            // Update profile
            await _userProfilesContainer.UpsertItemAsync(
                profile,
                new PartitionKey(sessionId)
            );

            return Ok(new { 
                success = true,
                messagesToday = messagesToday + 1,
                shouldShowRegistration = messagesToday + 1 >= MaxMessagesPerDay
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking chat message");
            return StatusCode(500, "An error occurred while tracking the message");
        }
    }

    [HttpGet("profile/{sessionId}")]
    public async Task<ActionResult<UserProfile>> GetProfile(string sessionId)
    {
        try
        {
            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.sessionId = @sessionId")
                .WithParameter("@sessionId", sessionId);

            var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(query);
            var results = await iterator.ReadNextAsync();
            var profile = results.FirstOrDefault();

            if (profile == null)
                return NotFound("User profile not found");

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user profile");
            return StatusCode(500, "An error occurred while getting the profile");
        }
    }

    [HttpPost("session")]
    public ActionResult<object> GenerateSessionId()
    {
        var sessionId = Guid.NewGuid().ToString();
        return Ok(new { sessionId });
    }

    private string? GetSessionIdFromRequest()
    {
        // Try to get from request body (for backward compatibility)
        if (Request.HasFormContentType && Request.Form.ContainsKey("sessionId"))
            return Request.Form["sessionId"];
        // Try to get from JSON body
        if (Request.ContentType != null && Request.ContentType.Contains("application/json"))
        {
            using var reader = new StreamReader(Request.Body, leaveOpen: true);
            var body = reader.ReadToEndAsync().Result;
            if (!string.IsNullOrEmpty(body) && body.Contains("sessionId"))
            {
                var json = System.Text.Json.JsonDocument.Parse(body);
                if (json.RootElement.TryGetProperty("sessionId", out var sessionIdProp))
                    return sessionIdProp.GetString();
            }
        }
        // Try to get from cookie
        if (Request.Cookies.TryGetValue("chatbotSessionId", out var cookieSessionId))
            return cookieSessionId;
        return null;
    }
}

public class ChatMessageRequest
{
    public string SessionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsUser { get; set; }
} 