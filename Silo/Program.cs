// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT License.

using Azure.Data.Tables;
using Azure.Identity;
using Microsoft.Data.Sqlite;
using Orleans.ShoppingCart.Silo.Services;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    var useLocalDatabase = builder.Configuration.GetValue<bool>("UseLocalDatabase");
    
    builder.UseOrleans(siloBuilder =>
    {
        siloBuilder.UseLocalhostClustering();
        
        if (useLocalDatabase)
        {
            var connectionString = builder.Configuration.GetConnectionString("LocalDatabaseConnectionString") 
                ?? "Data Source=orleans_shopping_cart.db;Cache=Shared";
            
            siloBuilder.UseAdoNetClustering(options =>
            {
                options.ConnectionString = connectionString;
                options.Invariant = "Microsoft.Data.Sqlite";
            })
            .AddAdoNetGrainStorage("shopping-cart", options =>
            {
                options.ConnectionString = connectionString;
                options.Invariant = "Microsoft.Data.Sqlite";
            });
        }
        else
        {
            siloBuilder.AddMemoryGrainStorage("shopping-cart");
        }
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
app.UseStaticFiles();
app.UseRouting();

app.MapControllers(); // Map API controllers
app.MapBlazorHub();
app.MapFallbackToPage("/_Host");
await app.RunAsync();
