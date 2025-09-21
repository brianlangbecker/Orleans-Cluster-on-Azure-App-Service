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
using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    builder.UseOrleans(siloBuilder =>
    {
        siloBuilder.UseLocalhostClustering()
                  .AddMemoryGrainStorage("shopping-cart")
                  .AddActivityPropagation();  // Enable activity propagation for tracing
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
            })
        .AddActivityPropagation();
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
        // Focus on business logic traces, not Orleans internals
        .AddSource("Orleans.ShoppingCart.API")  // Our custom controller source
        .AddSource("Orleans.ShoppingCart")
        .AddSource("Orleans.ShoppingCart.Services")
        .AddSource("System.Net.Http")  // HTTP client calls
        // Only add specific Orleans sources we care about, not all runtime internals
        .SetResourceBuilder(ResourceBuilder.CreateDefault()
            .AddService("orleans-shopping-cart")
            .AddAttributes(new Dictionary<string, object>
            {
                { "service.instance.id", Environment.MachineName },
                { "deployment.environment", Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "development" },
                { "app.type", "orleans" },
                { "app.framework", "dotnet" }
            }))
        .AddAspNetCoreInstrumentation(options =>
        {
            options.RecordException = true;
            // Capture all requests including API calls
            options.Filter = ctx => true;  // Don't filter anything for now
            options.EnrichWithHttpRequest = (activity, httpRequest) =>
            {
                activity?.SetTag("http.request.method", httpRequest.Method);
                activity?.SetTag("http.request.path", httpRequest.Path.Value);
                activity?.SetTag("http.request.query", httpRequest.QueryString.Value);
            };
            options.EnrichWithHttpResponse = (activity, httpResponse) =>
            {
                activity?.SetTag("http.response.status_code", httpResponse.StatusCode);
            };
            options.EnrichWithException = (activity, exception) =>
            {
                activity?.SetTag("error", true);
                activity?.SetTag("error.type", exception.GetType().Name);
                activity?.SetTag("error.message", exception.Message);
            };
        })
        .AddHttpClientInstrumentation(options =>
        {
            options.RecordException = true;
            options.FilterHttpRequestMessage = req => true;  // Capture all HTTP requests
            options.EnrichWithHttpRequestMessage = (activity, httpRequestMessage) =>
            {
                activity?.SetTag("http.client.method", httpRequestMessage.Method.ToString());
                activity?.SetTag("http.client.uri", httpRequestMessage.RequestUri?.ToString());
            };
            options.EnrichWithHttpResponseMessage = (activity, httpResponseMessage) =>
            {
                activity?.SetTag("http.client.status_code", (int)httpResponseMessage.StatusCode);
            };
        })
        .AddOtlpExporter(options =>
        {
            var endpoint = Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT") ?? "http://localhost:4318";
            options.Endpoint = new Uri($"{endpoint}/v1/traces");
            options.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.HttpProtobuf;
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
