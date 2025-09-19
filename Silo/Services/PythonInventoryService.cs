using System.Text.Json;

namespace Orleans.ShoppingCart.Silo.Services;

/// <summary>
/// Inventory service that calls the Python microservice instead of Orleans grains
/// </summary>
public sealed class PythonInventoryService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PythonInventoryService> _logger;
    private readonly string _pythonServiceUrl;

    public PythonInventoryService(HttpClient httpClient, ILogger<PythonInventoryService> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _pythonServiceUrl = configuration.GetValue<string>("PythonInventoryServiceUrl") ?? "http://localhost:8000";
    }

    public async Task<HashSet<ProductDetails>> GetAllProductsAsync()
    {
        try
        {
            _logger.LogInformation("Calling Python inventory service at {Url}/products", _pythonServiceUrl);
            
            var response = await _httpClient.GetAsync($"{_pythonServiceUrl}/products");
            
            if (response.IsSuccessStatusCode)
            {
                var jsonContent = await response.Content.ReadAsStringAsync();
                var products = JsonSerializer.Deserialize<List<ProductDetailsDto>>(jsonContent, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                var result = new HashSet<ProductDetails>();
                if (products != null)
                {
                    foreach (var dto in products)
                    {
                        result.Add(DtoToProductDetails(dto));
                    }
                }

                _logger.LogInformation("Successfully retrieved {Count} products from Python service", result.Count);
                return result;
            }
            else
            {
                _logger.LogWarning("Python inventory service returned {StatusCode}: {ReasonPhrase}", 
                    response.StatusCode, response.ReasonPhrase);
                
                // Fallback to empty set
                return new HashSet<ProductDetails>();
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error calling Python inventory service at {Url}", _pythonServiceUrl);
            return new HashSet<ProductDetails>();
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "JSON deserialization error from Python inventory service");
            return new HashSet<ProductDetails>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling Python inventory service");
            return new HashSet<ProductDetails>();
        }
    }

    public async Task<bool> IsServiceHealthyAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_pythonServiceUrl}/health");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private static ProductDetails DtoToProductDetails(ProductDetailsDto dto)
    {
        return new ProductDetails
        {
            Id = dto.Id,
            Name = dto.Name,
            Description = dto.Description,
            Category = Enum.TryParse<ProductCategory>(dto.Category, out var category) ? category : ProductCategory.Other,
            Quantity = dto.Quantity,
            UnitPrice = dto.UnitPrice,
            DetailsUrl = dto.DetailsUrl,
            ImageUrl = dto.ImageUrl
        };
    }

    /// <summary>
    /// DTO class matching the Python API response format
    /// </summary>
    private class ProductDetailsDto
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string Category { get; set; } = "Other";
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public string? DetailsUrl { get; set; }
        public string? ImageUrl { get; set; }
    }
}