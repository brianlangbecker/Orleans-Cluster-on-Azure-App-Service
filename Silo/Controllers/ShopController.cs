using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace Orleans.ShoppingCart.Silo.Controllers;

[ApiController]
[Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
public class ShopController : ControllerBase
{
    private static readonly ActivitySource ActivitySource = new("Orleans.ShoppingCart.API", "1.0.0");
    
    private readonly ShoppingCartService _shoppingCartService;
    private readonly InventoryService _inventoryService;
    private readonly PythonInventoryService _pythonInventoryService;
    private readonly ProductService _productService;
    private readonly IGrainFactory _grainFactory;
    private readonly ILogger<ShopController> _logger;

    public ShopController(
        ShoppingCartService shoppingCartService,
        InventoryService inventoryService,
        PythonInventoryService pythonInventoryService,
        ProductService productService,
        IGrainFactory grainFactory,
        ILogger<ShopController> logger)
    {
        _shoppingCartService = shoppingCartService;
        _inventoryService = inventoryService;
        _pythonInventoryService = pythonInventoryService;
        _productService = productService;
        _grainFactory = grainFactory;
        _logger = logger;
    }

    [HttpGet("products")]
    public async Task<ActionResult<object>> GetProducts()
    {
        using var activity = ActivitySource.StartActivity("ShopController.GetProducts");
        activity?.SetTag("api.endpoint", "/api/shop/products");
        activity?.SetTag("operation", "get_products");
        
        try
        {
            // Call both Orleans and Python services concurrently for distributed tracing
            var orléansTask = _inventoryService.GetAllProductsAsync();
            var pythonTask = _pythonInventoryService.GetAllProductsAsync();
            var healthTask = _pythonInventoryService.IsServiceHealthyAsync();
            
            await Task.WhenAll(orléansTask, pythonTask, healthTask);
            
            var orléansProducts = orléansTask.Result;
            var pythonProducts = pythonTask.Result;
            var pythonHealthy = healthTask.Result;
            
            // Use Orleans products for the UI (they have the actual data)
            var result = new
            {
                success = true,
                count = orléansProducts.Count,
                products = orléansProducts.Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    description = p.Description,
                    category = p.Category.ToString(),
                    quantity = p.Quantity,
                    unitPrice = p.UnitPrice,
                    detailsUrl = p.DetailsUrl,
                    imageUrl = p.ImageUrl
                }),
                // Include Python service status for debugging
                python = new
                {
                    healthy = pythonHealthy,
                    productCount = pythonProducts.Count
                }
            };
            
            activity?.SetTag("orleans.products.count", orléansProducts.Count);
            activity?.SetTag("python.products.count", pythonProducts.Count);
            activity?.SetTag("python.healthy", pythonHealthy);
            activity?.SetTag("success", true);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting products");
            activity?.SetTag("error", ex.Message);
            activity?.SetTag("success", false);
            
            return StatusCode(500, new { success = false, error = "Failed to load products" });
        }
    }

    [HttpGet("cart")]
    public async Task<ActionResult<object>> GetCart()
    {
        using var activity = ActivitySource.StartActivity("ShopController.GetCart");
        activity?.SetTag("api.endpoint", "/api/shop/cart");
        activity?.SetTag("operation", "get_cart");
        
        try
        {
            var cartItems = await _shoppingCartService.GetAllItemsAsync();
            
            var result = new
            {
                success = true,
                count = cartItems.Count,
                totalPrice = cartItems.Sum(item => item.Quantity * item.Product.UnitPrice),
                items = cartItems.Select(item => new
                {
                    productId = item.Product.Id,
                    productName = item.Product.Name,
                    quantity = item.Quantity,
                    unitPrice = item.Product.UnitPrice,
                    totalPrice = item.Quantity * item.Product.UnitPrice,
                    imageUrl = item.Product.ImageUrl
                })
            };
            
            activity?.SetTag("cart_items.count", cartItems.Count);
            activity?.SetTag("cart.total_price", result.totalPrice);
            activity?.SetTag("success", true);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cart");
            activity?.SetTag("error", ex.Message);
            activity?.SetTag("success", false);
            
            return StatusCode(500, new { success = false, error = "Failed to load cart" });
        }
    }

    [HttpPost("cart/add/{productId}")]
    public async Task<ActionResult<object>> AddToCart(string productId, [FromBody] AddToCartRequest? request = null)
    {
        using var activity = ActivitySource.StartActivity("ShopController.AddToCart");
        activity?.SetTag("api.endpoint", "/api/shop/cart/add/{productId}");
        activity?.SetTag("operation", "add_to_cart");
        activity?.SetTag("product.id", productId);
        
        try
        {
            var quantity = request?.Quantity ?? 1;
            activity?.SetTag("quantity", quantity);
            
            // Get the product from Orleans
            var products = await _inventoryService.GetAllProductsAsync();
            var product = products.FirstOrDefault(p => p.Id == productId);
            
            if (product == null)
            {
                activity?.SetTag("error", "product_not_found");
                activity?.SetTag("success", false);
                return NotFound(new { success = false, error = "Product not found" });
            }

            activity?.SetTag("product.name", product.Name);
            activity?.SetTag("product.price", product.UnitPrice);

            // Call Python service for inventory validation (to show distributed tracing)
            var pythonHealthy = await _pythonInventoryService.IsServiceHealthyAsync();
            activity?.SetTag("python.inventory.healthy", pythonHealthy);
            
            // Optional: Also check Python inventory for this product (for demonstration)
            try 
            {
                var pythonProducts = await _pythonInventoryService.GetAllProductsAsync();
                activity?.SetTag("python.inventory.checked", true);
                activity?.SetTag("python.inventory.count", pythonProducts.Count);
            }
            catch (Exception ex)
            {
                activity?.SetTag("python.inventory.error", ex.Message);
                activity?.SetTag("python.inventory.checked", false);
                // Don't fail the add to cart if Python service is down
            }

            // Add to cart
            var success = await _shoppingCartService.AddOrUpdateItemAsync(quantity, product);
            
            if (success)
            {
                var cartItems = await _shoppingCartService.GetAllItemsAsync();
                
                var result = new
                {
                    success = true,
                    message = $"Added {product.Name} to cart",
                    cartCount = cartItems.Count,
                    cartTotal = cartItems.Sum(item => item.Quantity * item.Product.UnitPrice)
                };
                
                activity?.SetTag("success", true);
                activity?.SetTag("updated_cart.count", cartItems.Count);
                
                return Ok(result);
            }
            else
            {
                activity?.SetTag("success", false);
                activity?.SetTag("error", "add_to_cart_failed");
                return StatusCode(500, new { success = false, error = "Failed to add item to cart" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding to cart: {ProductId}", productId);
            activity?.SetTag("error", ex.Message);
            activity?.SetTag("success", false);
            
            return StatusCode(500, new { success = false, error = "Failed to add item to cart" });
        }
    }

    [HttpDelete("cart/remove/{productId}")]
    public async Task<ActionResult<object>> RemoveFromCart(string productId)
    {
        using var activity = ActivitySource.StartActivity("ShopController.RemoveFromCart");
        activity?.SetTag("api.endpoint", "/api/shop/cart/remove/{productId}");
        activity?.SetTag("operation", "remove_from_cart");
        activity?.SetTag("product.id", productId);
        
        try
        {
            // Get the product first to include in activity
            var products = await _inventoryService.GetAllProductsAsync();
            var product = products.FirstOrDefault(p => p.Id == productId);
            
            if (product != null)
            {
                activity?.SetTag("product.name", product.Name);
                
                await _shoppingCartService.RemoveItemAsync(product);
                
                var cartItems = await _shoppingCartService.GetAllItemsAsync();
                
                var result = new
                {
                    success = true,
                    message = $"Removed {product.Name} from cart",
                    cartCount = cartItems.Count,
                    cartTotal = cartItems.Sum(item => item.Quantity * item.Product.UnitPrice)
                };
                
                activity?.SetTag("success", true);
                activity?.SetTag("updated_cart.count", cartItems.Count);
                
                return Ok(result);
            }
            else
            {
                activity?.SetTag("error", "product_not_found");
                activity?.SetTag("success", false);
                return NotFound(new { success = false, error = "Product not found" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing from cart: {ProductId}", productId);
            activity?.SetTag("error", ex.Message);
            activity?.SetTag("success", false);
            
            return StatusCode(500, new { success = false, error = "Failed to remove item from cart" });
        }
    }

    [HttpPut("cart/update/{productId}")]
    public async Task<ActionResult<object>> UpdateCartQuantity(string productId, [FromBody] UpdateQuantityRequest request)
    {
        using var activity = ActivitySource.StartActivity("ShopController.UpdateCartQuantity");
        activity?.SetTag("api.endpoint", "/api/shop/cart/update/{productId}");
        activity?.SetTag("operation", "update_cart_quantity");
        activity?.SetTag("product.id", productId);
        activity?.SetTag("new_quantity", request.Quantity);
        
        try
        {
            if (request.Quantity <= 0)
            {
                activity?.SetTag("error", "invalid_quantity");
                activity?.SetTag("success", false);
                return BadRequest(new { success = false, error = "Quantity must be greater than 0" });
            }

            // Get the product from Orleans
            var products = await _inventoryService.GetAllProductsAsync();
            var product = products.FirstOrDefault(p => p.Id == productId);
            
            if (product == null)
            {
                activity?.SetTag("error", "product_not_found");
                activity?.SetTag("success", false);
                return NotFound(new { success = false, error = "Product not found" });
            }

            activity?.SetTag("product.name", product.Name);
            activity?.SetTag("product.price", product.UnitPrice);

            // Update the cart item with new quantity
            var success = await _shoppingCartService.AddOrUpdateItemAsync(request.Quantity, product);
            
            if (success)
            {
                var cartItems = await _shoppingCartService.GetAllItemsAsync();
                
                var result = new
                {
                    success = true,
                    message = $"Updated {product.Name} quantity to {request.Quantity}",
                    cartCount = cartItems.Count,
                    cartTotal = cartItems.Sum(item => item.Quantity * item.Product.UnitPrice)
                };
                
                activity?.SetTag("success", true);
                activity?.SetTag("updated_cart.count", cartItems.Count);
                
                return Ok(result);
            }
            else
            {
                activity?.SetTag("success", false);
                activity?.SetTag("error", "update_quantity_failed");
                return StatusCode(500, new { success = false, error = "Failed to update quantity" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating cart quantity: {ProductId}", productId);
            activity?.SetTag("error", ex.Message);
            activity?.SetTag("success", false);
            
            return StatusCode(500, new { success = false, error = "Failed to update quantity" });
        }
    }

    [HttpDelete("cart/clear")]
    public async Task<ActionResult<object>> ClearCart()
    {
        using var activity = ActivitySource.StartActivity("ShopController.ClearCart");
        activity?.SetTag("api.endpoint", "/api/shop/cart/clear");
        activity?.SetTag("operation", "clear_cart");
        
        try
        {
            var cartItems = await _shoppingCartService.GetAllItemsAsync();
            var itemCount = cartItems.Count;
            
            activity?.SetTag("items_to_remove.count", itemCount);
            
            await _shoppingCartService.EmptyCartAsync();
            
            var result = new
            {
                success = true,
                message = $"Removed {itemCount} items from cart",
                cartCount = 0,
                cartTotal = 0.0m
            };
            
            activity?.SetTag("success", true);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing cart");
            activity?.SetTag("error", ex.Message);
            activity?.SetTag("success", false);
            
            return StatusCode(500, new { success = false, error = "Failed to clear cart" });
        }
    }

    [HttpPost("products")]
    public async Task<ActionResult<object>> CreateProduct([FromBody] ProductDetails product)
    {
        using var activity = ActivitySource.StartActivity("ShopController.CreateProduct");
        activity?.SetTag("api.endpoint", "/api/shop/products");
        activity?.SetTag("operation", "create_product");
        activity?.SetTag("product.name", product.Name);
        
        try
        {
            _logger.LogInformation("Creating new product: {ProductName}", product.Name);
            
            // Generate ID if not provided
            if (string.IsNullOrEmpty(product.Id))
            {
                product = product with { Id = "prod-" + Guid.NewGuid().ToString("N")[..8] };
            }
            
            // Use ProductService to create the product
            await _productService.CreateOrUpdateProductAsync(product);
            
            var result = new
            {
                success = true,
                message = $"Product '{product.Name}' created successfully",
                product = product
            };
            
            activity?.SetTag("success", true);
            activity?.SetTag("product.id", product.Id);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating product: {ProductName}", product.Name);
            activity?.SetTag("error", ex.Message);
            activity?.SetTag("success", false);
            
            return StatusCode(500, new { success = false, error = "Failed to create product" });
        }
    }

    [HttpPut("products/{productId}")]
    public async Task<ActionResult<object>> UpdateProduct(string productId, [FromBody] ProductDetails product)
    {
        using var activity = ActivitySource.StartActivity("ShopController.UpdateProduct");
        activity?.SetTag("api.endpoint", "/api/shop/products/{productId}");
        activity?.SetTag("operation", "update_product");
        activity?.SetTag("product.id", productId);
        activity?.SetTag("product.name", product.Name);
        
        try
        {
            _logger.LogInformation("Updating product: {ProductId} - {ProductName}", productId, product.Name);
            
            // Ensure the product ID matches the URL parameter
            product = product with { Id = productId };
            
            // Use ProductService to update the product
            await _productService.CreateOrUpdateProductAsync(product);
            
            var result = new
            {
                success = true,
                message = $"Product '{product.Name}' updated successfully",
                product = product
            };
            
            activity?.SetTag("success", true);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating product: {ProductId}", productId);
            activity?.SetTag("error", ex.Message);
            activity?.SetTag("success", false);
            
            return StatusCode(500, new { success = false, error = "Failed to update product" });
        }
    }

    [HttpDelete("products/{productId}")]
    public async Task<ActionResult<object>> DeleteProduct(string productId)
    {
        using var activity = ActivitySource.StartActivity("ShopController.DeleteProduct");
        activity?.SetTag("api.endpoint", "/api/shop/products/{productId}");
        activity?.SetTag("operation", "delete_product");
        activity?.SetTag("product.id", productId);
        
        try
        {
            _logger.LogInformation("Deleting product: {ProductId}", productId);
            
            // First, get the product details to know which category it belongs to
            var productGrain = _grainFactory.GetGrain<IProductGrain>(productId);
            var productDetails = await productGrain.GetProductDetailsAsync();
            
            if (productDetails == null)
            {
                return NotFound(new { success = false, error = $"Product '{productId}' not found" });
            }
            
            // Remove from the correct category-specific inventory grain
            var categoryName = productDetails.Category.ToString();
            var inventoryGrain = _grainFactory.GetGrain<IInventoryGrain>(categoryName);
            await inventoryGrain.RemoveProductAsync(productId);
            
            _logger.LogInformation("Removed product {ProductId} from {Category} inventory", productId, categoryName);
            
            // Note: Product grains don't have explicit delete - they'll be garbage collected when no longer referenced
            
            var result = new
            {
                success = true,
                message = $"Product '{productId}' deleted successfully"
            };
            
            activity?.SetTag("success", true);
            activity?.SetTag("product.category", categoryName);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting product: {ProductId}", productId);
            activity?.SetTag("error", ex.Message);
            activity?.SetTag("success", false);
            
            return StatusCode(500, new { success = false, error = "Failed to delete product" });
        }
    }
}

public class AddToCartRequest
{
    public int Quantity { get; set; } = 1;
}

public class UpdateQuantityRequest
{
    public int Quantity { get; set; }
}