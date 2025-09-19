"""
Python Inventory Service - Core business logic
"""
import asyncio
import aiohttp
import logging
from typing import Set, List, Dict, Optional
from models import ProductDetails, ProductCategory


class InventoryService:
    """
    Python equivalent of the C# InventoryService
    Manages product inventory across all categories
    """
    
    def __init__(self, orleans_base_url: str = "http://localhost:5001"):
        self.orleans_base_url = orleans_base_url
        self.logger = logging.getLogger(__name__)
        self._product_cache: Dict[str, ProductDetails] = {}
        self._last_cache_update = None

    async def get_all_products_async(self) -> Set[ProductDetails]:
        """
        Get all products from all categories
        Equivalent to C# InventoryService.GetAllProductsAsync()
        """
        all_products = set()
        
        # Get products from each category
        for category in ProductCategory:
            try:
                products = await self._get_products_by_category_async(category)
                all_products.update(products)
            except Exception as e:
                self.logger.error(f"Failed to get products for category {category.value}: {e}")
                
        return all_products

    async def _get_products_by_category_async(self, category: ProductCategory) -> List[ProductDetails]:
        """
        Get products from a specific category by calling Orleans InventoryGrain
        """
        try:
            async with aiohttp.ClientSession() as session:
                # Call Orleans API endpoint for inventory grain
                url = f"{self.orleans_base_url}/api/inventory/{category.value}/products"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        products_data = await response.json()
                        return [ProductDetails.from_dict(product) for product in products_data]
                    else:
                        self.logger.warning(f"Failed to get products for {category.value}: {response.status}")
                        return []
                        
        except Exception as e:
            self.logger.error(f"Error calling Orleans service for category {category.value}: {e}")
            return []

    async def get_product_count_async(self) -> int:
        """Get total count of all products"""
        products = await self.get_all_products_async()
        return len(products)

    async def get_products_by_category_async(self, category: ProductCategory) -> List[ProductDetails]:
        """Get products filtered by category"""
        return await self._get_products_by_category_async(category)

    async def get_product_by_id_async(self, product_id: str) -> Optional[ProductDetails]:
        """Get a specific product by ID"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.orleans_base_url}/api/products/{product_id}"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        product_data = await response.json()
                        return ProductDetails.from_dict(product_data)
                    elif response.status == 404:
                        return None
                    else:
                        self.logger.warning(f"Failed to get product {product_id}: {response.status}")
                        return None
                        
        except Exception as e:
            self.logger.error(f"Error getting product {product_id}: {e}")
            return None

    async def add_or_update_product_async(self, product: ProductDetails) -> bool:
        """Add or update a product via Orleans"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.orleans_base_url}/api/inventory/{product.category.value}/products"
                
                async with session.post(url, json=product.to_dict()) as response:
                    return response.status in [200, 201]
                    
        except Exception as e:
            self.logger.error(f"Error adding/updating product {product.id}: {e}")
            return False

    async def remove_product_async(self, product_id: str, category: ProductCategory) -> bool:
        """Remove a product via Orleans"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.orleans_base_url}/api/inventory/{category.value}/products/{product_id}"
                
                async with session.delete(url) as response:
                    return response.status in [200, 204]
                    
        except Exception as e:
            self.logger.error(f"Error removing product {product_id}: {e}")
            return False

    async def health_check_async(self) -> Dict[str, any]:
        """Health check for the service"""
        try:
            product_count = await self.get_product_count_async()
            return {
                "status": "healthy",
                "product_count": product_count,
                "orleans_url": self.orleans_base_url
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "orleans_url": self.orleans_base_url
            }