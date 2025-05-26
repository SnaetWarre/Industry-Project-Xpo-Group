using Microsoft.Azure.Cosmos;
using VectorEmbeddingService.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        policy.WithOrigins(
            "https://www.abissummit.be",
            "https://www.artisan-xpo.be",
            "https://www.flandersflooringdays.com",
            "http://localhost:3000",
            "http://localhost:5173",  // Vite default port
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173"
        )
        .AllowAnyMethod()
        .AllowAnyHeader();
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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Add security headers
app.Use(async (context, next) =>
{
    // Basic security headers that won't interfere with cross-origin embedding
    context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Add("X-Frame-Options", "SAMEORIGIN");
    context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Add("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    context.Response.Headers.Add("Content-Security-Policy", "default-src 'self'; connect-src 'self' https://*.openai.azure.com;");
    context.Response.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseHttpsRedirection();
app.UseCors("AllowSpecificOrigins");
app.UseAuthorization();
app.MapControllers();

// Initialize CosmosDB database and container if they don't exist
await InitializeCosmosDbAsync(app.Services);

app.Run();

static async Task InitializeCosmosDbAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var cosmosClient = scope.ServiceProvider.GetRequiredService<CosmosClient>();

    try
    {
        var databaseName = configuration["CosmosDb:DatabaseName"] ?? throw new ArgumentNullException("CosmosDb:DatabaseName");

        // Create database if it doesn't exist
        var databaseResponse = await cosmosClient.CreateDatabaseIfNotExistsAsync(databaseName);
        logger.LogInformation("Database '{DatabaseName}' ready", databaseName);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error initializing CosmosDB");
        throw;
    }
} 