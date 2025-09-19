# Python Inventory Microservice

This is a Python FastAPI microservice that provides inventory management functionality for the Orleans Shopping Cart application. It demonstrates converting a C# Orleans grain-based service to a standalone Python microservice.

## Architecture

The Python service replicates the functionality of the original C# `InventoryService` class, providing a REST API that can be called by the Orleans application or any other client.

### Original C# Service
- **InventoryService.cs** - Called Orleans `IInventoryGrain` grains for each product category
- **InventoryGrain.cs** - Stored product catalog by category using Orleans persistence

### Python Microservice Equivalent
- **inventory_service.py** - Core business logic (calls back to Orleans via HTTP)
- **api.py** - FastAPI REST endpoints
- **models.py** - Data models matching C# classes

## Features

- 🔄 **Full API compatibility** with original Orleans service
- 🐍 **FastAPI framework** with automatic OpenAPI documentation
- 📊 **Health checks** and service monitoring
- 🔗 **Orleans integration** via HTTP API calls
- 🧪 **Easy testing** with built-in API docs
- 🚀 **Simple deployment** with management scripts

## API Endpoints

### Products
- `GET /products` - Get all products from all categories
- `GET /products/{product_id}` - Get specific product by ID
- `GET /categories/{category}/products` - Get products by category
- `POST /categories/{category}/products` - Add or update product
- `DELETE /categories/{category}/products/{product_id}` - Remove product

### Utility
- `GET /health` - Service health check
- `GET /categories` - List all available categories
- `GET /` - Service information
- `GET /docs` - Interactive API documentation

## Setup and Running

### 1. Start the Python Service

```bash
# From the orleans project root directory
cd python-inventory-service

# Run the management script (handles virtualenv, dependencies, etc.)
./run-python-inventory.sh start
```

The service will be available at:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 2. Start the Orleans Application

```bash
# From the orleans project root directory
./run-orleans.sh start
```

The Orleans app will be available at:
- **Web App**: http://localhost:5001
- **API Endpoints**: http://localhost:5001/api/

## Integration Points

### Orleans → Python
The Orleans app can call the Python service instead of using Orleans grains:

```csharp
// Original Orleans grain-based service
var products = await orléansInventoryService.GetAllProductsAsync();

// New Python microservice call
var products = await pythonInventoryService.GetAllProductsAsync();
```

### Python → Orleans
The Python service can call back to Orleans APIs for data:

```python
# Python calling Orleans API
async with aiohttp.ClientSession() as session:
    url = f"{orleans_base_url}/api/inventory/{category}/products"
    async with session.get(url) as response:
        products = await response.json()
```

## Testing the Integration

### 1. Test Endpoints
```bash
# Test Orleans products (original)
curl http://localhost:5001/api/test/orleans-products

# Test Python products (new microservice)
curl http://localhost:5001/api/test/python-products

# Compare both services
curl http://localhost:5001/api/test/compare
```

### 2. API Documentation
Visit http://localhost:8000/docs for interactive API testing

### 3. Service Health
```bash
curl http://localhost:8000/health
```

## Service Management Commands

### Python Service
```bash
./run-python-inventory.sh start    # Start the service
./run-python-inventory.sh stop     # Stop the service
./run-python-inventory.sh restart  # Restart the service
./run-python-inventory.sh status   # Check status
./run-python-inventory.sh logs     # View logs
./run-python-inventory.sh setup    # Setup Python environment only
```

### Orleans Application
```bash
./run-orleans.sh start    # Start Orleans app
./run-orleans.sh stop     # Stop Orleans app
./run-orleans.sh status   # Check status
./run-orleans.sh logs     # View logs
```

## Configuration

### Python Service Configuration
- **Port**: 8000 (configurable in `run-python-inventory.sh`)
- **Orleans URL**: http://localhost:5001 (configurable in `inventory_service.py`)

### Orleans Configuration
- **Python Service URL**: Configured in `appsettings.Development.json`
```json
{
  "PythonInventoryServiceUrl": "http://localhost:8000"
}
```

## Data Models

The Python models match the C# equivalents:

### ProductDetails
```python
@dataclass
class ProductDetails:
    id: Optional[str]
    name: Optional[str]
    description: Optional[str]
    category: ProductCategory
    quantity: int
    unit_price: Decimal
    details_url: Optional[str]
    image_url: Optional[str]
```

### ProductCategory
```python
class ProductCategory(Enum):
    ACCESSORIES = "Accessories"
    HARDWARE = "Hardware"
    SOFTWARE = "Software"
    BOOKS = "Books"
    MOVIES = "Movies"
    MUSIC = "Music"
    GAMES = "Games"
    OTHER = "Other"
```

## Benefits of This Architecture

1. **Language Diversity** - Mix C# Orleans with Python microservices
2. **Independent Scaling** - Scale inventory service separately
3. **Technology Choice** - Use Python's ecosystem for specific features
4. **Service Isolation** - Inventory failures don't crash the main app
5. **API-First Design** - Clear service boundaries via REST APIs

## Monitoring with OpenTelemetry

When instrumenting with OpenTelemetry, this architecture will show:

1. **Orleans.ShoppingCart.Silo** service (main app)
2. **Python.Inventory.Service** service (this microservice)
3. **HTTP traces** between services
4. **Service dependencies** in service maps

This demonstrates how Orleans applications can integrate with polyglot microservices architectures!