using Microsoft.Azure.Cosmos;
using VectorEmbeddingService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "VectorEmbeddingService", Version = "v1" });
    options.SwaggerDoc("dashboard", new OpenApiInfo { Title = "Dashboard", Version = "v1" });
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
            "http://127.0.0.1:5500"
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
    options.DefaultAuthenticateScheme = "JwtBearer";
    options.DefaultChallengeScheme = "JwtBearer";
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new()
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = false
        // For production, set ValidateIssuer/ValidateAudience/IssuerSigningKey as needed
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

app.Run();