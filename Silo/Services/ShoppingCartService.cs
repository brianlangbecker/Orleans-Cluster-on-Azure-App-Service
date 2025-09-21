// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT License.

using System.Diagnostics;

namespace Orleans.ShoppingCart.Silo.Services;

public sealed class ShoppingCartService : BaseClusterService
{
    private static readonly ActivitySource ActivitySource = new("Orleans.ShoppingCart.Services", "1.0.0");
    
    public ShoppingCartService(
        IHttpContextAccessor httpContextAccessor, IClusterClient client) :
        base(httpContextAccessor, client)
    {
    }

    public async Task<HashSet<CartItem>> GetAllItemsAsync()
    {
        using var activity = ActivitySource.StartActivity("ShoppingCartService.GetAllItems");
        activity?.SetTag("operation", "get_all_items");
        
        var result = await TryUseGrain<IShoppingCartGrain, Task<HashSet<CartItem>>>(
            cart => cart.GetAllItemsAsync(),
            () => Task.FromResult(new HashSet<CartItem>()));
            
        activity?.SetTag("items.count", result.Count);
        activity?.SetTag("success", true);
        
        return result;
    }

    public async Task<int> GetCartCountAsync()
    {
        using var activity = ActivitySource.StartActivity("ShoppingCartService.GetCartCount");
        activity?.SetTag("operation", "get_cart_count");
        
        var result = await TryUseGrain<IShoppingCartGrain, Task<int>>(
            cart => cart.GetTotalItemsInCartAsync(),
            () => Task.FromResult(0));
            
        activity?.SetTag("cart.count", result);
        activity?.SetTag("success", true);
        
        return result;
    }

    public async Task EmptyCartAsync()
    {
        using var activity = ActivitySource.StartActivity("ShoppingCartService.EmptyCart");
        activity?.SetTag("operation", "empty_cart");
        
        await TryUseGrain<IShoppingCartGrain, Task>(
            cart => cart.EmptyCartAsync(), 
            () => Task.CompletedTask);
            
        activity?.SetTag("success", true);
    }

    public async Task<bool> AddOrUpdateItemAsync(int quantity, ProductDetails product)
    {
        using var activity = ActivitySource.StartActivity("ShoppingCartService.AddOrUpdateItem");
        activity?.SetTag("operation", "add_or_update_item");
        activity?.SetTag("product.id", product.Id);
        activity?.SetTag("product.name", product.Name);
        activity?.SetTag("quantity", quantity);
        
        var result = await TryUseGrain<IShoppingCartGrain, Task<bool>>(
            cart => cart.AddOrUpdateItemAsync(quantity, product),
            () => Task.FromResult(false));
            
        activity?.SetTag("success", result);
        
        return result;
    }

    public async Task RemoveItemAsync(ProductDetails product)
    {
        using var activity = ActivitySource.StartActivity("ShoppingCartService.RemoveItem");
        activity?.SetTag("operation", "remove_item");
        activity?.SetTag("product.id", product.Id);
        activity?.SetTag("product.name", product.Name);
        
        await TryUseGrain<IShoppingCartGrain, Task>(
            cart => cart.RemoveItemAsync(product),
            () => Task.CompletedTask);
            
        activity?.SetTag("success", true);
    }
}
