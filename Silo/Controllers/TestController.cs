using Microsoft.AspNetCore.Mvc;

namespace Orleans.ShoppingCart.Silo.Controllers;

[ApiController]
[Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
public class TestController : ControllerBase
{
    private readonly InventoryService _orléansInventoryService;
    private readonly PythonInventoryService _pythonInventoryService;
    private readonly ILogger<TestController> _logger;

    public TestController(
        InventoryService orléansInventoryService,
        PythonInventoryService pythonInventoryService,
        ILogger<TestController> logger)
    {
        _orléansInventoryService = orléansInventoryService;
        _pythonInventoryService = pythonInventoryService;
        _logger = logger;
    }

    [HttpGet("orleans-products")]
    public async Task<ActionResult<object>> GetOrleansProducts()
    {
        try
        {
            var products = await _orléansInventoryService.GetAllProductsAsync();
            return Ok(new
            {
                source = "Orleans Grains",
                count = products.Count,
                products = products.Take(5) // Show first 5 for brevity
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting products from Orleans");
            return StatusCode(500, "Error getting products from Orleans");
        }
    }

    [HttpGet("python-products")]
    public async Task<ActionResult<object>> GetPythonProducts()
    {
        try
        {
            var products = await _pythonInventoryService.GetAllProductsAsync();
            return Ok(new
            {
                source = "Python Microservice",
                count = products.Count,
                products = products.Take(5) // Show first 5 for brevity
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting products from Python service");
            return StatusCode(500, "Error getting products from Python service");
        }
    }

    [HttpGet("compare")]
    public async Task<ActionResult<object>> CompareServices()
    {
        try
        {
            var orléansTask = _orléansInventoryService.GetAllProductsAsync();
            var pythonTask = _pythonInventoryService.GetAllProductsAsync();

            await Task.WhenAll(orléansTask, pythonTask);

            var orléansProducts = orléansTask.Result;
            var pythonProducts = pythonTask.Result;

            return Ok(new
            {
                orleans = new
                {
                    source = "Orleans Grains",
                    count = orléansProducts.Count,
                    sample = orléansProducts.Take(2)
                },
                python = new
                {
                    source = "Python Microservice",
                    count = pythonProducts.Count,
                    sample = pythonProducts.Take(2)
                },
                comparison = new
                {
                    dataMatch = orléansProducts.Count == pythonProducts.Count,
                    orléansCount = orléansProducts.Count,
                    pythonCount = pythonProducts.Count
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error comparing services");
            return StatusCode(500, "Error comparing services");
        }
    }
}