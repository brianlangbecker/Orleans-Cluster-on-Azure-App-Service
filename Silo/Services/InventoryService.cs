// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT License.
using System.Linq;
using System.Diagnostics;
namespace Orleans.ShoppingCart.Silo.Services;

public sealed class InventoryService(IClusterClient client)
{
    private static readonly ActivitySource ActivitySource = new("Orleans.ShoppingCart.Services", "1.0.0");
    
    public async Task<HashSet<ProductDetails>> GetAllProductsAsync()
    {
        using var activity = ActivitySource.StartActivity("InventoryService.GetAllProducts");
        activity?.SetTag("service.name", "orleans-inventory");
        activity?.SetTag("operation", "get_all_products");
        
        var allProducts = new HashSet<ProductDetails>();
        var categories = Enum.GetNames<ProductCategory>();
        
        activity?.SetTag("categories.count", categories.Length);

        foreach (var category in categories)
        {
            using var categoryActivity = ActivitySource.StartActivity($"InventoryService.GetProducts.{category}");
            categoryActivity?.SetTag("category", category);
            
            var categoryProductCount = 0;
            await foreach (var product in client.GetGrain<IInventoryGrain>(category).GetAllProductsAsync())
            {
                allProducts.Add(product);
                categoryProductCount++;
            }
            
            categoryActivity?.SetTag("products.count", categoryProductCount);
        }

        activity?.SetTag("success", true);
        activity?.SetTag("total_products.count", allProducts.Count);
        
        return allProducts;
    }
}
