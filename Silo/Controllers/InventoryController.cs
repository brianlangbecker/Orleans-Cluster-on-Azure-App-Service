using Microsoft.AspNetCore.Mvc;

namespace Orleans.ShoppingCart.Silo.Controllers;

[ApiController]
[Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly IClusterClient _client;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(IClusterClient client, ILogger<InventoryController> logger)
    {
        _client = client;
        _logger = logger;
    }

    [HttpGet("{category}/products")]
    public async Task<ActionResult<IEnumerable<ProductDetails>>> GetProductsByCategory(string category)
    {
        try
        {
            var inventoryGrain = _client.GetGrain<IInventoryGrain>(category);
            var products = new List<ProductDetails>();
            
            await foreach (var product in inventoryGrain.GetAllProductsAsync())
            {
                products.Add(product);
            }
            
            return Ok(products);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting products for category {Category}", category);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{category}/products")]
    public async Task<ActionResult<ProductDetails>> AddOrUpdateProduct(string category, [FromBody] ProductDetails product)
    {
        try
        {
            var inventoryGrain = _client.GetGrain<IInventoryGrain>(category);
            await inventoryGrain.AddOrUpdateProductAsync(product);
            
            return Ok(product);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding/updating product {ProductId} in category {Category}", product.Id, category);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpDelete("{category}/products/{productId}")]
    public async Task<ActionResult> RemoveProduct(string category, string productId)
    {
        try
        {
            var inventoryGrain = _client.GetGrain<IInventoryGrain>(category);
            await inventoryGrain.RemoveProductAsync(productId);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing product {ProductId} from category {Category}", productId, category);
            return StatusCode(500, "Internal server error");
        }
    }
}

[ApiController]
[Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IClusterClient _client;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(IClusterClient client, ILogger<ProductsController> logger)
    {
        _client = client;
        _logger = logger;
    }

    [HttpGet("{productId}")]
    public async Task<ActionResult<ProductDetails>> GetProductById(string productId)
    {
        try
        {
            var productGrain = _client.GetGrain<IProductGrain>(productId);
            var product = await productGrain.GetProductDetailsAsync();
            
            if (product == null)
            {
                return NotFound();
            }
            
            return Ok(product);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting product {ProductId}", productId);
            return StatusCode(500, "Internal server error");
        }
    }
}