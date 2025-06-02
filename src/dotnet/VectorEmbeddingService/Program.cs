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
            "http://localhost:5500",
            "http://127.0.0.1:5500"
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

// Add CORS before anything else that handles requests!
app.UseCors("AllowSpecificOrigins");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();