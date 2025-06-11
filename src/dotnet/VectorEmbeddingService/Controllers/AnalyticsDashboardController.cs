using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;
using VectorEmbeddingService.Models;
using System.Globalization;
using System.Text;

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
            .Where(d => d.CompanyStats != null)
            .Sum(d => d.CompanyStats.Values.Sum());
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
                if (day.CompanyStats != null)
                {
                    foreach (var (company, count) in day.CompanyStats)
                    {
                        result.Add(new
                        {
                            company,
                            date,
                            count
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
            registrationClicks = a.Days.Values.Where(d => d.CompanyStats != null).Sum(d => d.CompanyStats.Values.Sum()),
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
                    companyStats = day.CompanyStats,
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
        sb.AppendLine("Company,Date,Count");
        foreach (var a in analytics)
        {
            foreach (var (date, day) in a.Days)
            {
                if (day.CompanyStats != null)
                {
                    foreach (var (company, count) in day.CompanyStats)
                    {
                        sb.AppendLine($"{company},{date},{count}");
                    }
                }
            }
        }
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "registration_clicks.csv");
    }

    /// <summary>
    /// Get activity (messages, registrations) over a date range.
    /// </summary>
    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity([FromQuery] string from, [FromQuery] string to, [FromQuery] string website)
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
                            registrations = day.CompanyStats?.Values.Sum() ?? 0
                        });
                    }
                }
            }
        }
        return Ok(result);
    }
} 