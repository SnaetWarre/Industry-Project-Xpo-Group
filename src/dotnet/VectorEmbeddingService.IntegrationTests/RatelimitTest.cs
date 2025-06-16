using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace VectorEmbeddingService.IntegrationTests;

public class ChatControllerRateLimitTests : IClassFixture<WebApplicationFactory<VectorEmbeddingService.Program>>
{
    private readonly WebApplicationFactory<VectorEmbeddingService.Program> _factory;
    public ChatControllerRateLimitTests(WebApplicationFactory<VectorEmbeddingService.Program> factory)
    {
        _factory = factory;
        Environment.SetEnvironmentVariable("RATE_LIMIT_MAX_USER_PER_DAY", "3");
        Environment.SetEnvironmentVariable("RATE_LIMIT_MAX_REQUESTS", "1");
        Environment.SetEnvironmentVariable("RATE_LIMIT_WINDOW_SECONDS", "1");
    }

    [Fact]
    public async Task DemoRateLimit_EnforcesLimitsCorrectly()
    {
        var sessionClient = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });

        // 1. First request should succeed
        var resp1 = await sessionClient.GetAsync("/api/chat/demo-ratelimit");
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);

        // 2. Immediate second request should be rate limited
        var resp2 = await sessionClient.GetAsync("/api/chat/demo-ratelimit");
        Assert.Equal((HttpStatusCode)429, resp2.StatusCode);

        // 3. Wait, should succeed again
        await Task.Delay(1100);
        var resp3 = await sessionClient.GetAsync("/api/chat/demo-ratelimit");
        Assert.Equal(HttpStatusCode.OK, resp3.StatusCode);

        // 4. Wait, should be blocked by daily limit
        await Task.Delay(1100);
        var resp4 = await sessionClient.GetAsync("/api/chat/demo-ratelimit");
        Assert.Equal((HttpStatusCode)429, resp4.StatusCode);

        // 5. Any further requests should be blocked by daily limit
        await Task.Delay(1100);
        var resp5 = await sessionClient.GetAsync("/api/chat/demo-ratelimit");
        Assert.Equal((HttpStatusCode)429, resp5.StatusCode);

        // 6. And again, should still be blocked
        await Task.Delay(1100);
        var resp6 = await sessionClient.GetAsync("/api/chat/demo-ratelimit");
        Assert.Equal((HttpStatusCode)429, resp6.StatusCode);
    }
}
