using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace VectorEmbeddingService.Controllers;

public class User
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly List<User> _users;

    public AuthController(IConfiguration configuration)
    {
        _configuration = configuration;
        _users = _configuration.GetSection("Users").Get<List<User>>() ?? new List<User>();
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Username and password are required");

        var user = _users.FirstOrDefault(u => u.Username == request.Username && u.Password == request.Password);
        if (user == null)
        {
            // Log failed login attempt
            Console.WriteLine($"Failed login attempt for username: {request.Username}");
            return Unauthorized("Invalid username or password");
        }

        var token = GenerateJwtToken(request.Username);

        // Set JWT as HTTP-only cookie
        var isProduction = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
        Response.Cookies.Append(
            "jwt",
            token,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = isProduction, // Secure=true in production (requires HTTPS)
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddHours(24)
            }
        );

        // Log successful login
        Console.WriteLine($"Successful login for username: {request.Username}");

        return Ok(new { token });
    }

    private string GenerateJwtToken(string username)
    {
        var key = _configuration["Jwt:Key"] ?? "supersecretkey1234567890";
        var issuer = _configuration["Jwt:Issuer"] ?? "VectorEmbeddingService";
        var audience = _configuration["Jwt:Audience"] ?? "DashboardUsers";
        var expires = DateTime.UtcNow.AddHours(24);

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

    [HttpGet("me")]
    public IActionResult Me()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Unauthorized();
        var user = _users.FirstOrDefault(u => u.Username == username);
        if (user == null)
            return NotFound();
        return Ok(new { user.Name, user.Role, user.Username });
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
} 