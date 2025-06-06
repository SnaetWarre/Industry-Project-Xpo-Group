using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace VectorEmbeddingService.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    // In-memory user store for demo
    private static readonly Dictionary<string, string> Users = new()
    {
        { "admin@kortrijkxpo.be", "RfkeU2VvaM3Xy3LLxc8Jdzn7rbHgMV2pMBec89Rns9h4LfoXzP987908LJKHKJLHJLK876789687YKYIUJKHKJLHIOUJKHLKJHULIHOIUH" }, 
        { "dashboard", "dashboardpass" }
    };

    private readonly IConfiguration _configuration;

    public AuthController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Username and password are required");

        if (!Users.TryGetValue(request.Username, out var storedPassword) || storedPassword != request.Password)
            return Unauthorized("Invalid username or password");

        var token = GenerateJwtToken(request.Username);
        return Ok(new { token });
    }

    private string GenerateJwtToken(string username)
    {
        var key = _configuration["Jwt:Key"] ?? "supersecretkey1234567890";
        var issuer = _configuration["Jwt:Issuer"] ?? "VectorEmbeddingService";
        var audience = _configuration["Jwt:Audience"] ?? "DashboardUsers";
        var expires = DateTime.UtcNow.AddHours(8);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Role, "DashboardUser")
        };

        var keyBytes = Encoding.UTF8.GetBytes(key);
        var creds = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
} 