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
    options.AddPolicy("AllowPythonChatbot", policy =>
    {
        policy.AllowAnyOrigin()
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
builder.Services.AddScoped<ICosmosDbService, CosmosDbService>();

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

app.UseHttpsRedirection();
app.UseCors("AllowPythonChatbot");
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
        var containerName = configuration["CosmosDb:ContainerName"] ?? throw new ArgumentNullException("CosmosDb:ContainerName");

        // Create database if it doesn't exist
        var databaseResponse = await cosmosClient.CreateDatabaseIfNotExistsAsync(databaseName);
        logger.LogInformation("Database '{DatabaseName}' ready", databaseName);

        // Create container if it doesn't exist with '/id' as partition key
        var containerProperties = new ContainerProperties(containerName, "/id");
        var containerResponse = await databaseResponse.Database.CreateContainerIfNotExistsAsync(containerProperties);
        logger.LogInformation("Container '{ContainerName}' ready", containerName);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error initializing CosmosDB");
        throw;
    }
} 