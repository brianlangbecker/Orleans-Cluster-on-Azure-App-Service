"""
FastAPI REST API for Python Inventory Service
"""
import asyncio
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from opentelemetry.trace import Status, StatusCode

from models import ProductDetails, ProductCategory
from inventory_service import InventoryService
from telemetry import initialize_telemetry, get_tracer, get_meter, get_custom_metrics


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Python Inventory Service",
    description="Inventory management service for Orleans Shopping Cart",
    version="1.0.0"
)

# Initialize OpenTelemetry
initialize_telemetry(app)
tracer = get_tracer()
meter = get_meter()
metrics = get_custom_metrics()

# Configure CORS to allow Orleans app to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5001", "http://127.0.0.1:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create inventory service instance
inventory_service = InventoryService()


# Pydantic models for API
class ProductResponse(BaseModel):
    id: Optional[str]
    name: Optional[str]
    description: Optional[str]
    category: str
    quantity: int
    unit_price: float
    total_price: float
    details_url: Optional[str]
    image_url: Optional[str]

class ProductRequest(BaseModel):
    id: Optional[str]
    name: Optional[str]
    description: Optional[str]
    category: str
    quantity: int
    unit_price: float
    details_url: Optional[str]
    image_url: Optional[str]

class HealthResponse(BaseModel):
    status: str
    product_count: Optional[int] = None
    error: Optional[str] = None
    orleans_url: str


def product_to_response(product: ProductDetails) -> ProductResponse:
    """Convert ProductDetails to API response model"""
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        category=product.category.value,
        quantity=product.quantity,
        unit_price=float(product.unit_price),
        total_price=float(product.total_price),
        details_url=product.details_url,
        image_url=product.image_url
    )


@app.get("/", summary="Root endpoint")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Python Inventory Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/products",
            "/products/{product_id}",
            "/categories/{category}/products",
            "/health"
        ]
    }


@app.get("/health", include_in_schema=False)
async def health_check():
    """Health check endpoint (no telemetry)"""
    return {"status": "ok"}


@app.get("/products", response_model=List[ProductResponse], summary="Get all products")
async def get_all_products():
    """Get all products from all categories"""
    with tracer.start_as_current_span("get_all_products") as span:
        try:
            start_time = asyncio.get_event_loop().time()
            products = await inventory_service.get_all_products_async()
            duration = asyncio.get_event_loop().time() - start_time
            
            # Record metrics
            metrics["operations"].add(1, {"operation": "get_all_products"})
            metrics["product_count"].add(len(products), {"source": "get_all_products"})
            metrics["request_duration"].record(duration, {"operation": "get_all_products"})
            
            # Add span attributes
            span.set_attributes({
                "product.count": len(products),
                "request.duration": duration,
                "success": True
            })
            
            return [product_to_response(product) for product in products]
        except Exception as e:
            logger.error(f"Error getting all products: {e}")
            # Record error in span
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            metrics["operations"].add(1, {"operation": "get_all_products", "status": "error"})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve products: {str(e)}"
            )


@app.get("/products/{product_id}", response_model=ProductResponse, summary="Get product by ID")
async def get_product_by_id(product_id: str):
    """Get a specific product by ID"""
    try:
        product = await inventory_service.get_product_by_id_async(product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found"
            )
        return product_to_response(product)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting product {product_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve product: {str(e)}"
        )


@app.get("/categories/{category}/products", response_model=List[ProductResponse], summary="Get products by category")
async def get_products_by_category(category: str):
    """Get all products in a specific category"""
    try:
        # Validate category
        try:
            product_category = ProductCategory(category)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category: {category}. Valid categories: {[c.value for c in ProductCategory]}"
            )
        
        products = await inventory_service.get_products_by_category_async(product_category)
        return [product_to_response(product) for product in products]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting products for category {category}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve products for category: {str(e)}"
        )


@app.post("/categories/{category}/products", response_model=ProductResponse, summary="Add or update product")
async def add_or_update_product(category: str, product_request: ProductRequest):
    """Add or update a product in the specified category"""
    try:
        # Validate category
        try:
            product_category = ProductCategory(category)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category: {category}. Valid categories: {[c.value for c in ProductCategory]}"
            )
        
        # Create ProductDetails from request
        from decimal import Decimal
        product = ProductDetails(
            id=product_request.id,
            name=product_request.name,
            description=product_request.description,
            category=product_category,
            quantity=product_request.quantity,
            unit_price=Decimal(str(product_request.unit_price)),
            details_url=product_request.details_url,
            image_url=product_request.image_url
        )
        
        success = await inventory_service.add_or_update_product_async(product)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add or update product"
            )
        
        return product_to_response(product)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding/updating product: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add or update product: {str(e)}"
        )


@app.delete("/categories/{category}/products/{product_id}", summary="Remove product")
async def remove_product(category: str, product_id: str):
    """Remove a product from the specified category"""
    try:
        # Validate category
        try:
            product_category = ProductCategory(category)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category: {category}. Valid categories: {[c.value for c in ProductCategory]}"
            )
        
        success = await inventory_service.remove_product_async(product_id, product_category)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found or could not be removed"
            )
        
        return {"message": f"Product {product_id} removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing product {product_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove product: {str(e)}"
        )


@app.get("/categories", summary="Get all categories")
async def get_categories():
    """Get list of all available product categories"""
    return {
        "categories": [category.value for category in ProductCategory]
    }


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )