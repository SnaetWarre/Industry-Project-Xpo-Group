# Use the official .NET SDK image for build and run (dev mode)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dev
WORKDIR /app
COPY . .
EXPOSE 5000 5001
COPY aspnet-dev.pfx .
ENV ASPNETCORE_ENVIRONMENT=Development
ENV ASPNETCORE_Kestrel__Certificates__Default__Password=yourpassword
ENV ASPNETCORE_Kestrel__Certificates__Default__Path=aspnet-dev.pfx
ENTRYPOINT ["dotnet", "bin/Debug/net8.0/VectorEmbeddingService.dll"]

# Use the official .NET SDK image for build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o out

# Use the official ASP.NET runtime image for running the app
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out .
COPY appsettings.json ./appsettings.json
EXPOSE 5001
ENV ASPNETCORE_URLS=https://+:5001;http://+:5000
ENTRYPOINT ["dotnet", "bin/Debug/net8.0/VectorEmbeddingService.dll"] 