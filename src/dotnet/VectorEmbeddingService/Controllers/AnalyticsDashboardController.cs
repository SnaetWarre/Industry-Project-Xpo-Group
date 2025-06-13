using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;
using VectorEmbeddingService.Models;
using System.Globalization;
using System.Text;
using Swashbuckle.AspNetCore.Annotations;

namespace VectorEmbeddingService.Controllers;

[ApiController]
[Route("api/analytics-dashboard")]
[Authorize] // Require JWT for all dashboard endpoints
[ApiExplorerSettings(GroupName = "dashboard")]
public class AnalyticsDashboardController : ControllerBase
{
    private readonly Container _analyticsContainer;
    private readonly Container _userProfilesContainer;

    public AnalyticsDashboardController(CosmosClient cosmosClient)
    {
        var db = cosmosClient.GetDatabase("XpoData");
        _analyticsContainer = db.GetContainer("analytics");
        _userProfilesContainer = db.GetContainer("userProfiles");
    }

    /// <summary>
    /// Get dashboard overview stats (registration clicks, users, conversion %, avg. response time, etc.)
    /// </summary>
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] string website)
    {
        // Get all analytics docs for the website
        var query = new QueryDefinition("SELECT * FROM c WHERE c.website = @website")
            .WithParameter("@website", website);
        var analytics = new List<WeeklyAnalytics>();
        using (var iterator = _analyticsContainer.GetItemQueryIterator<WeeklyAnalytics>(query))
        {
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                analytics.AddRange(response);
            }
        }
        // Registration clicks
        int registrationClicks = analytics
            .SelectMany(a => a.Days.Values)
            .Where(d => d.ProfileInfoStats != null)
            .Sum(d => d.ProfileInfoStats.Values.Count(v => v));
        // Users
        var userQuery = new QueryDefinition("SELECT VALUE COUNT(1) FROM c WHERE c.website = @website")
            .WithParameter("@website", website);
        int users = 0;
        using (var iterator = _userProfilesContainer.GetItemQueryIterator<int>(userQuery))
        {
            var response = await iterator.ReadNextAsync();
            users = response.FirstOrDefault();
        }
        // Conversion rate (registrations / users)
        double conversionRate = users > 0 ? (double)registrationClicks / users : 0.0;
        // Avg response time (not tracked, return 0 for now)
        int avgResponseTimeMs = 0;
        return Ok(new
        {
            registrationClicks,
            users,
            conversionRate,
            avgResponseTimeMs
        });
    }

    /// <summary>
    /// Get all registration clicks for a given week and website.
    /// </summary>
    [HttpGet("registration-clicks")]
    public async Task<IActionResult> GetRegistrationClicks([FromQuery] string website, [FromQuery] int year, [FromQuery] int week)
    {
        var id = $"{year}-W{week}_{website}";
        var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @id AND c.website = @website")
            .WithParameter("@id", id)
            .WithParameter("@website", website);
        var analytics = new List<WeeklyAnalytics>();
        using (var iterator = _analyticsContainer.GetItemQueryIterator<WeeklyAnalytics>(query))
        {
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                analytics.AddRange(response);
            }
        }
        var result = new List<object>();
        foreach (var a in analytics)
        {
            foreach (var (date, day) in a.Days)
            {
                if (day.ProfileInfoStats != null)
                {
                    foreach (var (profileInfo, clicked) in day.ProfileInfoStats)
                    {
                        // Zoek de sessie voor deze profileInfo
                        double? chatToRegistrationSeconds = null;
                        if (day.SessionData != null)
                        {
                            var session = day.SessionData.Values.FirstOrDefault(s => s.ProfileInfo == profileInfo);
                            if (session != null)
                            {
                                chatToRegistrationSeconds = session.ChatToRegistrationSeconds;
                            }
                        }
                        result.Add(new
                        {
                            profileInfo,
                            date,
                            count = clicked ? 1 : 0,
                            chatToRegistrationSeconds
                        });
                    }
                }
            }
        }
        return Ok(result);
    }

    /// <summary>
    /// Get weekly stats for a website (sessions, registrations, etc.)
    /// </summary>
    [HttpGet("weekly")]
    public async Task<IActionResult> GetWeeklyStats([FromQuery] string website)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.website = @website")
            .WithParameter("@website", website);
        var analytics = new List<WeeklyAnalytics>();
        using (var iterator = _analyticsContainer.GetItemQueryIterator<WeeklyAnalytics>(query))
        {
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                analytics.AddRange(response);
            }
        }
        var result = analytics.Select(a => new
        {
            week = a.Id,
            registrationClicks = a.Days.Values.Where(d => d.ProfileInfoStats != null).Sum(d => d.ProfileInfoStats.Values.Count(v => v)),
            sessions = a.Days.Values.Sum(d => d.UniqueSessions.Count)
        });
        return Ok(result);
    }

    /// <summary>
    /// Get daily stats for a website.
    /// </summary>
    [HttpGet("daily")]
    public async Task<IActionResult> GetDailyStats([FromQuery] string website)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.website = @website")
            .WithParameter("@website", website);
        var analytics = new List<WeeklyAnalytics>();
        using (var iterator = _analyticsContainer.GetItemQueryIterator<WeeklyAnalytics>(query))
        {
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                analytics.AddRange(response);
            }
        }
        var dailyStats = new List<object>();
        foreach (var week in analytics)
        {
            foreach (var (date, day) in week.Days)
            {
                dailyStats.Add(new
                {
                    date,
                    uniqueSessions = day.UniqueSessions?.Count ?? 0,
                    profileInfoStats = day.ProfileInfoStats,
                    sessionData = day.SessionData
                });
            }
        }
        return Ok(dailyStats.OrderBy(d => ((dynamic)d).date));
    }

    /// <summary>
    /// Get user profile stats for a website.
    /// </summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUserProfiles([FromQuery] string website)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.website = @website")
            .WithParameter("@website", website);
        var users = new List<UserProfile>();
        using (var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(query))
        {
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                users.AddRange(response);
            }
        }
        var result = users.Select(u => new
        {
            ProfileInfo = u.ProfileInfo,
            u.CreatedAt
        });
        return Ok(result);
    }

    /// <summary>
    /// Get chat history for a user by sessionId.
    /// </summary>
    [HttpGet("chat-history/{sessionId}")]
    public async Task<IActionResult> GetChatHistory(string sessionId)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.sessionId = @sessionId")
            .WithParameter("@sessionId", sessionId);
        var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(query);
        var results = await iterator.ReadNextAsync();
        var profile = results.FirstOrDefault();
        if (profile == null)
            return NotFound("User profile not found");
        return Ok(profile.ChatHistory);
    }

    /// <summary>
    /// Export registration clicks as CSV.
    /// </summary>
    [HttpGet("export/registration-clicks.csv")]
    public async Task<IActionResult> ExportRegistrationClicksCsv([FromQuery] string website, [FromQuery] int year, [FromQuery] int week)
    {
        var id = $"{year}-W{week}_{website}";
        var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @id AND c.website = @website")
            .WithParameter("@id", id)
            .WithParameter("@website", website);
        var analytics = new List<WeeklyAnalytics>();
        using (var iterator = _analyticsContainer.GetItemQueryIterator<WeeklyAnalytics>(query))
        {
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                analytics.AddRange(response);
            }
        }
        var sb = new StringBuilder();
        sb.AppendLine("ProfileInfo,Date,Count");
        foreach (var a in analytics)
        {
            foreach (var (date, day) in a.Days)
            {
                if (day.ProfileInfoStats != null)
                {
                    foreach (var (profileInfo, clicked) in day.ProfileInfoStats)
                    {
                        sb.AppendLine($"{profileInfo},{date},{(clicked ? 1 : 0)}");
                    }
                }
            }
        }
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "registration_clicks.csv");
    }

    /// <summary>
    /// Get activity (messages, registrations) over a date range.
    /// </summary>
    /// <param name="from">Start date (format: YYYY-MM-DD)</param>
    /// <param name="to">End date (format: YYYY-MM-DD)</param>
    /// <param name="website">Website ID (e.g., ffd, abiss, artisan)</param>
    /// <remarks>
    /// The 'from' and 'to' parameters must be in ISO 8601 format: YYYY-MM-DD (e.g., 2025-06-13).
    /// </remarks>
    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity(
        [FromQuery, SwaggerParameter("Start date (format: YYYY-MM-DD, e.g. 2025-06-13)")] string from,
        [FromQuery, SwaggerParameter("End date (format: YYYY-MM-DD, e.g. 2025-06-13)")] string to,
        [FromQuery, SwaggerParameter("Website ID (e.g. ffd, abiss, artisan)")] string website)
    {
        // Parse dates
        DateTime fromDate = DateTime.Parse(from);
        DateTime toDate = DateTime.Parse(to);
        var query = new QueryDefinition("SELECT * FROM c WHERE c.website = @website")
            .WithParameter("@website", website);
        var analytics = new List<WeeklyAnalytics>();
        using (var iterator = _analyticsContainer.GetItemQueryIterator<WeeklyAnalytics>(query))
        {
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                analytics.AddRange(response);
            }
        }
        var result = new List<object>();
        foreach (var a in analytics)
        {
            foreach (var (date, day) in a.Days)
            {
                if (DateTime.TryParse(date, out var d))
                {
                    if (d >= fromDate && d <= toDate)
                    {
                        result.Add(new
                        {
                            date,
                            messages = day.SessionData?.Count ?? 0,
                            registrations = day.ProfileInfoStats?.Values.Count(v => v) ?? 0
                        });
                    }
                }
            }
        }
        return Ok(result);
    }


    /// <summary>
    /// Export registration clicks as CSV for all websites (abiss, ffd, artisan).
    /// </summary>
    [HttpGet("export/registration-clicks-all.csv")]
    public async Task<IActionResult> ExportRegistrationClicksAllCsv()
    {
        var websiteIds = new[] { "abiss", "ffd", "artisan" };
        var sb = new StringBuilder();
        sb.AppendLine("Website,ProfileInfo,Date,Count");
        foreach (var website in websiteIds)
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.website = @website")
                .WithParameter("@website", website);
            var analytics = new List<WeeklyAnalytics>();
            using (var iterator = _analyticsContainer.GetItemQueryIterator<WeeklyAnalytics>(query))
            {
                while (iterator.HasMoreResults)
                {
                    var response = await iterator.ReadNextAsync();
                    analytics.AddRange(response);
                }
            }
            foreach (var a in analytics)
            {
                foreach (var (date, day) in a.Days)
                {
                    if (day.ProfileInfoStats != null)
                    {
                        foreach (var (profileInfo, clicked) in day.ProfileInfoStats)
                        {
                            sb.AppendLine($"{website},{profileInfo},{date},{(clicked ? 1 : 0)}");
                        }
                    }
                }
            }
        }
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "registration_clicks_all.csv");
    }

    /// <summary>
    /// Get total messages for a website (if provided) or for all websites.
    /// Only counts messages where IsUser is true (user messages only).
    /// Only allows website values: ffd, artisan, abiss.
    /// </summary>
    [HttpGet("total-messages")]
    public async Task<IActionResult> GetTotalMessages([FromQuery] string? website = null)
    {
        var allowedWebsites = new HashSet<string> { "ffd", "artisan", "abiss" };
        if (!string.IsNullOrEmpty(website) && !allowedWebsites.Contains(website))
        {
            return BadRequest(new { error = "Invalid website id. Allowed values: ffd, artisan, abiss." });
        }

        int chatMessages = 0;
        if (string.IsNullOrEmpty(website))
        {
            // Sum for all allowed websites
            foreach (var w in allowedWebsites)
            {
                var userQuery = new QueryDefinition("SELECT * FROM c WHERE c.website = @website").WithParameter("@website", w);
                var users = new List<UserProfile>();
                using (var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(userQuery))
                {
                    while (iterator.HasMoreResults)
                    {
                        var response = await iterator.ReadNextAsync();
                        users.AddRange(response);
                    }
                }
                chatMessages += users.Sum(u => u.ChatHistory?.Count(m => m.IsUser) ?? 0);
            }
        }
        else
        {
            var userQuery = new QueryDefinition("SELECT * FROM c WHERE c.website = @website").WithParameter("@website", website);
            var users = new List<UserProfile>();
            using (var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(userQuery))
            {
                while (iterator.HasMoreResults)
                {
                    var response = await iterator.ReadNextAsync();
                    users.AddRange(response);
                }
            }
            chatMessages = users.Sum(u => u.ChatHistory?.Count(m => m.IsUser) ?? 0);
        }
        return Ok(new { totalMessages = chatMessages });
    }

    /// <summary>
    /// Get the chat duration (in seconds and formatted) for a user profile by sessionId.
    /// </summary>
    [HttpGet("chat-duration/{sessionId}")]
    public async Task<IActionResult> GetChatDuration(string sessionId)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.sessionId = @sessionId")
            .WithParameter("@sessionId", sessionId);
        var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(query);
        var results = await iterator.ReadNextAsync();
        var profile = results.FirstOrDefault();
        if (profile == null || profile.ChatHistory == null || profile.ChatHistory.Count < 2)
            return Ok(new { durationSeconds = 0, formatted = "0s" });
        var ordered = profile.ChatHistory.OrderBy(m => m.Timestamp).ToList();
        var first = ordered.First().Timestamp;
        var last = ordered.Last().Timestamp;
        var duration = last - first;
        int totalSeconds = (int)duration.TotalSeconds;
        string formatted = FormatDuration(totalSeconds);
        return Ok(new { durationSeconds = totalSeconds, formatted });
    }

    /// <summary>
    /// Get the average chat duration (in seconds and formatted) for all user profiles, optionally filtered by website.
    /// </summary>
    [HttpGet("average-chat-duration")]
    public async Task<IActionResult> GetAverageChatDuration([FromQuery] string? website = null)
    {
        List<UserProfile> users = new List<UserProfile>();
        if (!string.IsNullOrEmpty(website))
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.website = @website")
                .WithParameter("@website", website);
            using var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(query);
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                users.AddRange(response);
            }
        }
        else
        {
            var query = new QueryDefinition("SELECT * FROM c");
            using var iterator = _userProfilesContainer.GetItemQueryIterator<UserProfile>(query);
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                users.AddRange(response);
            }
        }
        var durations = users
            .Where(u => u.ChatHistory != null && u.ChatHistory.Count >= 2)
            .Select(u => {
                var ordered = u.ChatHistory.OrderBy(m => m.Timestamp).ToList();
                return (int)(ordered.Last().Timestamp - ordered.First().Timestamp).TotalSeconds;
            })
            .Where(seconds => seconds > 0)
            .ToList();
        int avgSeconds = durations.Count > 0 ? (int)durations.Average() : 0;
        string formatted = FormatDuration(avgSeconds);
        return Ok(new { averageDurationSeconds = avgSeconds, formatted, count = durations.Count });
    }

    private static string FormatDuration(int totalSeconds)
    {
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        if (minutes > 0)
            return $"{minutes}m {seconds}s";
        return $"{seconds}s";
    }
} 