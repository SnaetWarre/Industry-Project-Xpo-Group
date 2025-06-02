using Microsoft.AspNetCore.Mvc;
using VectorEmbeddingService.Models;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

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
            if (string.IsNullOrEmpty(analyticsEvent.SessionId))
                return BadRequest("SessionId is required");

            if (string.IsNullOrEmpty(analyticsEvent.EventType))
                return BadRequest("EventType is required");

            // Generate a unique ID if not provided
            if (string.IsNullOrEmpty(analyticsEvent.Id))
                analyticsEvent.Id = Guid.NewGuid().ToString();

            // Set timestamp if not provided
            if (analyticsEvent.Timestamp == default)
                analyticsEvent.Timestamp = DateTime.UtcNow;

            // Upsert the event to CosmosDB
            await _analyticsContainer.UpsertItemAsync(
                analyticsEvent,
                new PartitionKey(analyticsEvent.SessionId)
            );

            _logger.LogInformation(
                "Analytics event tracked: {EventType} for session {SessionId}",
                analyticsEvent.EventType,
                analyticsEvent.SessionId
            );

            return Ok(new { success = true, id = analyticsEvent.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking analytics event");
            return StatusCode(500, "An error occurred while tracking the event");
        }
    }

    [HttpPost("profile")]
    public async Task<ActionResult> CreateOrUpdateProfile([FromBody] UserProfile profile)
    {
        try
        {
            if (string.IsNullOrEmpty(profile.SessionId))
                return BadRequest("SessionId is required");

            // Generate a unique ID if not provided
            if (string.IsNullOrEmpty(profile.Id))
                profile.Id = Guid.NewGuid().ToString();

            profile.UpdatedAt = DateTime.UtcNow;

            // Upsert the profile to CosmosDB
            await _userProfilesContainer.UpsertItemAsync(
                profile,
                new PartitionKey(profile.SessionId)
            );

            _logger.LogInformation(
                "User profile updated for session {SessionId}",
                profile.SessionId
            );

            return Ok(new { success = true, id = profile.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user profile");
            return StatusCode(500, "An error occurred while updating the profile");
        }
    }

    [HttpPost("chat")]
    public async Task<ActionResult> TrackChatMessage([FromBody] ChatMessageRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.SessionId))
                return BadRequest("SessionId is required");

            if (string.IsNullOrEmpty(request.Message))
                return BadRequest("Message is required");

            // Get user profile
            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.sessionId = @sessionId")
                .WithParameter("@sessionId", request.SessionId);

            var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(query);
            var results = await iterator.ReadNextAsync();
            var profile = results.FirstOrDefault();

            if (profile == null)
                return NotFound("User profile not found");

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

            // Add message to chat history
            profile.ChatHistory.Add(new ChatMessage
            {
                Timestamp = DateTime.UtcNow,
                Message = request.Message,
                IsUser = request.IsUser
            });

            profile.UpdatedAt = DateTime.UtcNow;

            // Update profile
            await _userProfilesContainer.UpsertItemAsync(
                profile,
                new PartitionKey(profile.SessionId)
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
}

public class ChatMessageRequest
{
    public string SessionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsUser { get; set; }
} 