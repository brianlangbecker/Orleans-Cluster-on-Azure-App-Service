using Microsoft.Data.Sqlite;

namespace Orleans.ShoppingCart.Silo.Services;

public class DatabaseInitializationService : IHostedService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseInitializationService> _logger;

    public DatabaseInitializationService(IConfiguration configuration, ILogger<DatabaseInitializationService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var useLocalDatabase = _configuration.GetValue<bool>("UseLocalDatabase");
        
        if (!useLocalDatabase)
        {
            _logger.LogInformation("Local database not enabled, skipping initialization");
            return;
        }

        var connectionString = _configuration.GetConnectionString("LocalDatabaseConnectionString");
        if (string.IsNullOrEmpty(connectionString))
        {
            _logger.LogWarning("No local database connection string configured");
            return;
        }

        try
        {
            await InitializeSqliteDatabase(connectionString);
            _logger.LogInformation("Local SQLite database initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize local SQLite database");
            throw;
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task InitializeSqliteDatabase(string connectionString)
    {
        using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync();

        // Create Orleans clustering table
        var createClusteringTable = @"
            CREATE TABLE IF NOT EXISTS OrleansQuery (
                DeploymentId TEXT NOT NULL,
                Address TEXT NOT NULL,
                Port INTEGER NOT NULL,
                Generation INTEGER NOT NULL,
                SiloName TEXT NOT NULL,
                HostName TEXT NOT NULL,
                Status INTEGER NOT NULL,
                ProxyPort INTEGER,
                SuspectTimes TEXT,
                StartTime TEXT NOT NULL,
                IAmAliveTime TEXT NOT NULL,
                PRIMARY KEY (DeploymentId, Address, Port, Generation)
            );";

        // Create Orleans storage table
        var createStorageTable = @"
            CREATE TABLE IF NOT EXISTS OrleansStorage (
                GrainIdHash INTEGER NOT NULL,
                GrainIdN0 BIGINT NOT NULL,
                GrainIdN1 BIGINT NOT NULL,
                GrainTypeHash INTEGER NOT NULL,
                GrainTypeString TEXT NOT NULL,
                GrainIdExtensionString TEXT,
                ServiceId TEXT NOT NULL,
                PayloadBinary BLOB,
                PayloadXml TEXT,
                PayloadJson TEXT,
                ModifiedOn TEXT NOT NULL,
                Version INTEGER,
                PRIMARY KEY (GrainIdHash, GrainTypeHash)
            );";

        using var command = connection.CreateCommand();
        
        command.CommandText = createClusteringTable;
        await command.ExecuteNonQueryAsync();
        
        command.CommandText = createStorageTable;
        await command.ExecuteNonQueryAsync();
    }
}