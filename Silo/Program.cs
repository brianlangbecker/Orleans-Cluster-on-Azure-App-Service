// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT License.

using Azure.Data.Tables;
using Azure.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.FileProviders;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Instrumentation.AspNetCore;
using OpenTelemetry.Instrumentation.Http;
using Orleans.ShoppingCart.Silo.Services;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    builder.UseOrleans(siloBuilder =>
    {
        siloBuilder.UseLocalhostClustering()
                  .AddMemoryGrainStorage("shopping-cart");
    });
}
else
{
    builder.UseOrleans(siloBuilder =>
    {
#pragma warning disable ORLEANSEXP003 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
        siloBuilder.AddDistributedGrainDirectory();
#pragma warning restore ORLEANSEXP003 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.

        var endpointAddress = IPAddress.Parse(builder.Configuration["WEBSITE_PRIVATE_IP"]!);
        var strPorts = builder.Configuration["WEBSITE_PRIVATE_PORTS"]!.Split(',');
        if (strPorts.Length < 2)
        {
            var env = Environment.GetEnvironmentVariable("WEBSITE_PRIVATE_PORTS");
            throw new Exception($"Insufficient private ports configured: WEBSITE_PRIVATE_PORTS: '{builder.Configuration["WEBSITE_PRIVATE_PORTS"]?.ToString()}' or '{env}.");
        }

        var (siloPort, gatewayPort) = (int.Parse(strPorts[0]), int.Parse(strPorts[1]));

        siloBuilder.ConfigureEndpoints(endpointAddress, siloPort, gatewayPort, listenOnAnyHostAddress: true)
        .Configure<ClusterOptions>(
            options =>
            {
                options.ClusterId = builder.Configuration["ORLEANS_CLUSTER_ID"];
                options.ServiceId = nameof(ShoppingCartService);
            })
        .UseAzureStorageClustering(
            options =>
            {
                options.TableServiceClient = new TableServiceClient(new Uri(builder.Configuration["ORLEANS_AZURE_STORAGE_URI"]!), new DefaultAzureCredential());
                options.TableName = $"{builder.Configuration["ORLEANS_CLUSTER_ID"]}Clustering";
            })
        .AddAzureTableGrainStorage("shopping-cart",
            options =>
            {
                options.TableServiceClient = new TableServiceClient(new Uri(builder.Configuration["ORLEANS_AZURE_STORAGE_URI"]!), new DefaultAzureCredential());
                options.TableName = $"{builder.Configuration["ORLEANS_CLUSTER_ID"]}Persistence";
            });
    });
}

var services = builder.Services;
services.AddMudServices();
services.AddRazorPages();
services.AddServerSideBlazor();
services.AddHttpContextAccessor();
services.AddControllers(); // Add API controllers support
services.AddHttpClient(); // Add HTTP client for calling Python service
services.AddSingleton<ShoppingCartService>();
services.AddSingleton<InventoryService>();
services.AddSingleton<PythonInventoryService>(); // Add Python inventory service
services.AddSingleton<ProductService>();
services.AddScoped<ComponentStateChangedObserver>();
services.AddSingleton<ToastService>();
services.AddLocalStorageServices();

// Configure OpenTelemetry
services.AddOpenTelemetry()
    .WithTracing(builder => builder
        .AddSource("Orleans.ShoppingCart")
        .AddSource("Orleans.ShoppingCart.API")
        .AddSource("Orleans.ShoppingCart.Services")
        .SetResourceBuilder(ResourceBuilder.CreateDefault()
            .AddService("orleans-shopping-cart"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation(options =>
        {
            options.EnrichWithHttpRequestMessage = (activity, httpRequestMessage) =>
            {
                activity?.SetTag("http.request.method", httpRequestMessage.Method.ToString());
                activity?.SetTag("http.request.uri", httpRequestMessage.RequestUri?.ToString());
            };
            options.EnrichWithHttpResponseMessage = (activity, httpResponseMessage) =>
            {
                activity?.SetTag("http.response.status_code", (int)httpResponseMessage.StatusCode);
            };
        })
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri(Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT") ?? "http://localhost:4318/v1/traces");
            if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("HONEYCOMB_API_KEY")))
            {
                options.Headers = $"x-honeycomb-team={Environment.GetEnvironmentVariable("HONEYCOMB_API_KEY")}";
            }
        }));

builder.Services.AddHostedService<ProductStoreSeeder>();
builder.Services.AddHostedService<DatabaseInitializationService>();

var app = builder.Build();

if (builder.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

// Configure static files to serve React app from Orleans
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "../shopping-cart-ui/dist")),
    RequestPath = ""
});

app.UseRouting();

// SPA fallback for React Router - serve index.html for all non-API routes
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value?.ToLower() ?? "";
    
    // Don't handle API calls, health checks, static assets, or Blazor routes
    if (path.StartsWith("/api") || path.StartsWith("/health") || 
        path.StartsWith("/assets") || path.Contains(".") ||
        path.StartsWith("/_blazor") || path.StartsWith("/_framework"))
    {
        await next();
        return;
    }
    
    // For all other routes, serve the React app index.html
    context.Request.Path = "/index.html";
    await next();
});

app.MapControllers(); // Map API controllers
await app.RunAsync();
