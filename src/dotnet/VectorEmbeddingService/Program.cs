using Microsoft.Azure.Cosmos;
using VectorEmbeddingService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.Annotations;

// Check for password hash generation command
if (args.Length > 0 && args[0] == "--generate-hashes")
{
    VectorEmbeddingService.PasswordHasher.GenerateHashesForConfig();
    return;
}

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "VectorEmbeddingService", Version = "v1" });
    options.SwaggerDoc("dashboard", new OpenApiInfo { Title = "Dashboard", Version = "v1" });

    // Add JWT Bearer
    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\""
    };
    options.AddSecurityDefinition("Bearer", securityScheme);

    var securityRequirement = new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    };
    options.AddSecurityRequirement(securityRequirement);

    options.EnableAnnotations();
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        policy.WithOrigins(
            "https://www.abissummit.be",
            "https://www.artisan-xpo.be",
            "https://www.flandersflooringdays.com",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "https://localhost:5500",
            "https://127.0.0.1:5500",
            "http://localhost:3000"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// Configure CosmosDB
builder.Services.AddSingleton<CosmosClient>(serviceProvider =>
{
    var configuration = serviceProvider.GetRequiredService<IConfiguration>();
    var connectionString = configuration["CosmosDb:ConnectionString"] ?? 
                          throw new ArgumentNullException("CosmosDb:ConnectionString");
    
    var cosmosClientOptions = new CosmosClientOptions
    {
        ConnectionMode = ConnectionMode.Gateway,
        SerializerOptions = new CosmosSerializationOptions
        {
            PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
        }
    };
    
    return new CosmosClient(connectionString, cosmosClientOptions);
});

// Register services
builder.Services.AddScoped<IEmbeddingService, AzureOpenAIEmbeddingService>();

// Add logging
builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.AddDebug();
});

// Add JWT authentication, but do not require globally
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var config = builder.Configuration;
    var key = config["Jwt:Key"] ?? "supersecretkey1234567890";
    var issuer = config["Jwt:Issuer"] ?? "VectorEmbeddingService";
    var audience = config["Jwt:Audience"] ?? "DashboardUsers";
    options.TokenValidationParameters = new()
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(key))
    };
});

var app = builder.Build();

// Add CORS before anything else that handles requests!
app.UseCors("AllowSpecificOrigins");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
        options.SwaggerEndpoint("/swagger/dashboard/swagger.json", "Dashboard");
    });
}

app.UseHttpsRedirection();
app.UseAuthentication(); // Only needed for [Authorize] controllers
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("export ASPNETCORE_ENVIRONMENT=Development");
Console.WriteLine("voer bovenstaande commmando uit in je terminal voor swagger te kunnen gebruiken");

app.Run();

// For integration testing with WebApplicationFactory
namespace VectorEmbeddingService
{
    public partial class Program { }
}