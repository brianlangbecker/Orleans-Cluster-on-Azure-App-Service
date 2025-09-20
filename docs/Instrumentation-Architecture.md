# Instrumentation Architecture for Observability Demo

## Overview

This document outlines the comprehensive observability instrumentation strategy for the Orleans Cluster project, designed to provide maximum observability value with minimal code disruption using OpenTelemetry and Honeycomb.io.

## Current Architecture Assessment

**Python FastAPI Service:**
- Clean async API layer with good separation of concerns
- Service layer (`InventoryService`) with business logic
- Health checks already implemented
- CORS configured for Orleans integration

**.NET Orleans Application:**
- Orleans grains with ASP.NET Core host
- Service layer with HTTP client calls to Python
- Blazor Server UI components
- Dual storage configuration (local dev/Azure prod)

## Instrumentation Strategy: "Layered Observability"

### 1. Frontend Layer - Browser Instrumentation
*Real User Monitoring (RUM) and frontend performance tracking*

**Browser JavaScript (Honeycomb OpenTelemetry Web)**:
```javascript
// Frontend setup using Honeycomb's OpenTelemetry Web distro
import { HoneycombWebSDK } from '@honeycombio/opentelemetry-web';

const honeycomb = new HoneycombWebSDK({
  apiKey: 'your_honeycomb_api_key',
  serviceName: 'orleans-frontend',
  environment: 'development', // or 'production'

  // Auto-instrumentation for common browser APIs
  instrumentations: [
    'fetch', 'xhr', 'user-interaction', 'document-load'
  ],

  // Capture Core Web Vitals automatically
  enableWebVitals: true,

  // Custom attributes for business context
  attributes: {
    'app.version': '1.0.0',
    'deployment.environment': 'development'
  }
});

// Start instrumentation
honeycomb.start();
```

**Custom Frontend Instrumentation:**
```javascript
// Custom business logic tracking
function instrumentBusinessAction(actionName, additionalAttributes = {}) {
  return honeycomb.trace.getActiveTracer().startActiveSpan(
    `frontend.${actionName}`,
    {
      attributes: {
        'user.action': actionName,
        'page.url': window.location.href,
        'page.title': document.title,
        ...additionalAttributes
      }
    },
    async (span) => {
      try {
        // Business logic here
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

// Usage examples
async function addToCart(productId, quantity) {
  return instrumentBusinessAction('add_to_cart', {
    'product.id': productId,
    'cart.quantity': quantity
  });
}

async function submitCheckout(cartTotal) {
  return instrumentBusinessAction('checkout_submit', {
    'cart.total': cartTotal,
    'checkout.step': 'payment'
  });
}
```

**Core Web Vitals and Performance Tracking:**
```javascript
// Automatic capture of Core Web Vitals
// - Largest Contentful Paint (LCP)
// - First Input Delay (FID) / Interaction to Next Paint (INP)
// - Cumulative Layout Shift (CLS)

// Custom performance measurements
function measurePageLoadPerformance() {
  const navigation = performance.getEntriesByType('navigation')[0];

  honeycomb.metrics.createHistogram('page_load_time', {
    description: 'Time to complete page load',
    unit: 'milliseconds'
  }).record(navigation.loadEventEnd - navigation.fetchStart, {
    'page.type': getPageType(),
    'user.agent': navigator.userAgent
  });
}

// User interaction tracking
function trackUserInteraction(element, action) {
  honeycomb.trace.getActiveTracer().startActiveSpan('user.interaction', {
    attributes: {
      'interaction.type': action,
      'element.tag': element.tagName,
      'element.id': element.id,
      'element.class': element.className
    }
  });
}
```

### 2. Foundation Layer - Auto-Instrumentation
*Maximum bang for buck with minimal code changes*

**Python (OpenTelemetry FastAPI)**:
```python
# One-time setup in main application startup
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor

# Auto-instrument at app startup
FastAPIInstrumentor.instrument_app(app)
HTTPXInstrumentor().instrument()
LoggingInstrumentor().instrument()
```

**.NET (OpenTelemetry ASP.NET Core)**:
```csharp
// Program.cs additions
builder.Services.AddOpenTelemetry()
    .WithTracing(builder => builder
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOrleans() // Custom Orleans instrumentation
    )
    .WithMetrics(builder => builder
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
    );
```

### 3. Business Logic Layer - Strategic Manual Instrumentation
*High-value custom instrumentation for business operations*

**Decorator-Based Approach for Python:**
```python
from functools import wraps
from opentelemetry import trace, metrics

def instrument_inventory_operation(operation_name: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            tracer = trace.get_tracer(__name__)
            with tracer.start_as_current_span(f"inventory.{operation_name}") as span:
                # Add business context
                span.set_attribute("inventory.operation", operation_name)
                span.set_attribute("inventory.product_count", len(args) if args else 0)

                try:
                    result = await func(*args, **kwargs)
                    span.set_attribute("inventory.success", True)
                    return result
                except Exception as e:
                    span.set_attribute("inventory.success", False)
                    span.set_attribute("inventory.error", str(e))
                    raise
        return wrapper
    return decorator

# Usage
@instrument_inventory_operation("get_products")
async def get_all_products_async(self) -> List[ProductDetails]:
    # Existing business logic unchanged
```

**Attribute-Based Approach for .NET:**
```csharp
[Trace("shopping-cart")]  // Custom attribute
public async Task<bool> AddOrUpdateItemAsync(int quantity, ProductDetails product)
{
    using var activity = ShoppingCartTelemetry.StartActivity("cart.add_item");
    activity?.SetTag("cart.product_id", product.Id);
    activity?.SetTag("cart.quantity", quantity.ToString());

    // Existing business logic
    var result = await TryUseGrain<IShoppingCartGrain, Task<bool>>(
        cart => cart.AddOrUpdateItemAsync(quantity, product),
        () => Task.FromResult(false));

    activity?.SetTag("cart.operation_success", result.ToString());
    return result;
}
```

### 4. Integration Layer - Cross-Service Correlation
*Distributed tracing across Orleans ↔ Python boundary*

**Correlation ID Propagation (Python):**
```python
# Python: Extract trace context from HTTP headers
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

@app.middleware("http")
async def trace_correlation_middleware(request: Request, call_next):
    # Extract trace context from incoming request
    propagator = TraceContextTextMapPropagator()
    context = propagator.extract(request.headers)

    # Set context for current request
    token = context_attach(context)
    try:
        response = await call_next(request)
        return response
    finally:
        context_detach(token)
```

**Correlation ID Propagation (.NET):**
```csharp
// .NET: Inject trace context into HTTP requests to Python
public class TracedHttpClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TracedHttpClient> _logger;

    public async Task<T> PostAsync<T>(string endpoint, object data)
    {
        using var activity = PythonServiceTelemetry.StartActivity($"python.{endpoint}");

        // Inject trace context into HTTP headers
        var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        ActivityContext.Inject(request.Headers);

        // Business logic with automatic correlation
        var response = await _httpClient.SendAsync(request);
        return await response.Content.ReadFromJsonAsync<T>();
    }
}
```

### 5. Metrics Layer - Business Intelligence
*Custom metrics for business KPIs and operational insights*

**High-Value Metrics to Track (Python):**
```python
# Python metrics
inventory_operations = metrics.get_meter(__name__).create_counter(
    "inventory_operations_total",
    description="Total inventory operations",
    unit="1"
)

inventory_product_count = metrics.get_meter(__name__).create_up_down_counter(
    "inventory_products_total",
    description="Current product count by category"
)

# Usage in business methods
@instrument_inventory_operation("add_product")
async def add_or_update_product_async(self, product: ProductDetails) -> bool:
    inventory_operations.add(1, {"operation": "add", "category": product.category.value})
    # ... business logic
    inventory_product_count.add(1, {"category": product.category.value})
```

**High-Value Metrics to Track (.NET):**
```csharp
// .NET metrics
private static readonly Counter<long> CartOperations =
    Meter.CreateCounter<long>("cart_operations_total");

private static readonly Histogram<double> CartOperationDuration =
    Meter.CreateHistogram<double>("cart_operation_duration_seconds");

public async Task<bool> AddOrUpdateItemAsync(int quantity, ProductDetails product)
{
    var stopwatch = Stopwatch.StartNew();
    var tags = new TagList { {"operation", "add"}, {"product_category", product.Category} };

    try
    {
        var result = await /* business logic */;
        CartOperations.Add(1, tags.Add("success", result.ToString()));
        return result;
    }
    finally
    {
        CartOperationDuration.Record(stopwatch.Elapsed.TotalSeconds, tags);
    }
}
```

### 6. Configuration Layer - Easy Management
*Centralized, environment-aware configuration*

**Shared Configuration Pattern:**
```python
# telemetry_config.py
@dataclass
class TelemetryConfig:
    service_name: str
    service_version: str
    environment: str
    honeycomb_api_key: str
    sampling_rate: float
    enable_debug_logging: bool

    @classmethod
    def from_env(cls) -> 'TelemetryConfig':
        return cls(
            service_name=os.getenv('OTEL_SERVICE_NAME', 'python-inventory'),
            service_version=os.getenv('OTEL_SERVICE_VERSION', '1.0.0'),
            environment=os.getenv('ENVIRONMENT', 'development'),
            honeycomb_api_key=os.getenv('HONEYCOMB_API_KEY', ''),
            sampling_rate=float(os.getenv('OTEL_TRACE_SAMPLING_RATE', '0.1')),
            enable_debug_logging=bool(os.getenv('OTEL_DEBUG', False))
        )
```

## Key Benefits of This Approach

1. **Minimal Code Disruption**: Auto-instrumentation handles 80% of telemetry
2. **High Business Value**: Manual instrumentation focuses on business-critical operations
3. **Easy Modification**: Decorator/attribute patterns for quick changes
4. **Consistent Correlation**: Seamless tracing across service boundaries
5. **Performance Conscious**: Configurable sampling and async operations
6. **Production Ready**: Environment-based configuration with fallbacks

## Implementation Phases

### Phase 1: Foundation Setup (Week 1)
*Get basic telemetry pipeline working - Layers 1 & 2*

**Goals:**
- Add OpenTelemetry dependencies to all services (Python, .NET, Frontend)
- Configure Honeycomb.io exporters for all components
- **Frontend Layer (Layer 1)**: Integrate Honeycomb Web SDK with auto-instrumentation for browser APIs
- **Foundation Layer (Layer 2)**: Enable auto-instrumentation for HTTP requests, database calls, logging
- Verify basic traces appear in Honeycomb from all layers

**Deliverables:**
- Updated `requirements.txt`, `.csproj`, and `package.json` files
- Honeycomb Web SDK integration with Core Web Vitals tracking
- Basic OpenTelemetry configuration for backend services
- Environment variables for Honeycomb connection
- First traces visible in Honeycomb dashboard from frontend, backend, and database operations

### Phase 2: Business Intelligence (Week 2)
*Add high-value custom instrumentation - Layers 3, 4 & 5*

**Goals:**
- **Business Logic Layer (Layer 3)**: Implement decorator/attribute patterns for key business operations
- **Integration Layer (Layer 4)**: Enable end-to-end trace correlation across Frontend → Orleans → Python → Database
- **Metrics Layer (Layer 5)**: Add custom metrics for business KPIs and user experience
- Instrument cart operations, inventory management, and user interactions
- Implement frontend business action tracking and RUM

**Deliverables:**
- Custom instrumentation decorators/attributes for backend services
- Frontend business action tracking (add to cart, checkout, page navigation)
- Cross-service trace correlation with proper context propagation
- Custom metrics collection including user experience metrics
- Complete distributed traces from browser clicks to database operations

### Phase 3: Production Readiness (Week 3)
*Add operational and performance monitoring - Layer 6 & Operations*

**Goals:**
- **Configuration Layer (Layer 6)**: Centralized, environment-aware telemetry configuration
- Infrastructure metrics collection (CPU, memory, disk, network)
- Error tracking and alerting configuration
- Performance optimization and sampling strategies
- Deployment preparation and monitoring setup

**Deliverables:**
- Environment-based configuration management
- Infrastructure monitoring setup
- Error tracking and alerting
- Performance-optimized configuration with appropriate sampling
- Deployment-ready instrumentation for all environments

## Key Metrics to Track

### Business Metrics
- **Cart Operations**: Add, remove, update items
- **Inventory Operations**: Product additions, updates, deletions
- **User Journey**: Page views, form submissions, purchases, user flows
- **Revenue Impact**: Transaction values, conversion rates, abandonment rates
- **Frontend Experience**: Core Web Vitals (LCP, FID/INP, CLS), page load times
- **User Engagement**: Click-through rates, time on page, bounce rates

### Technical Metrics
- **Performance**: Request latency, database query times
- **Reliability**: Error rates, success rates, timeouts
- **Infrastructure**: CPU, memory, disk usage, network I/O
- **Dependencies**: External service call success/failure rates

### Operational Metrics
- **Deployment**: Release markers, feature flag changes
- **Health**: Service availability, health check results
- **Capacity**: Request volume, concurrent users
- **Security**: Failed authentication attempts, unusual access patterns

## Tools and Libraries

### Frontend Dependencies
```json
{
  "dependencies": {
    "@honeycombio/opentelemetry-web": "^1.0.2"
  }
}
```

### Python Dependencies
```txt
opentelemetry-api
opentelemetry-sdk
opentelemetry-exporter-otlp
opentelemetry-instrumentation-fastapi
opentelemetry-instrumentation-httpx
opentelemetry-instrumentation-logging
opentelemetry-instrumentation-psycopg2  # For database
```

### .NET Dependencies
```xml
<PackageReference Include="OpenTelemetry" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" />
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" />
```

## Configuration Management

### Environment Variables
```bash
# Common configuration
OTEL_SERVICE_NAME=orleans-shopping-cart
OTEL_SERVICE_VERSION=1.0.0
ENVIRONMENT=development
HONEYCOMB_API_KEY=your_api_key_here

# Sampling and performance
OTEL_TRACE_SAMPLING_RATE=0.1
OTEL_METRIC_EXPORT_INTERVAL=5000
OTEL_DEBUG=false

# Service-specific
OTEL_SERVICE_NAME=python-inventory  # For Python service
OTEL_SERVICE_NAME=orleans-backend    # For .NET service
```

### Deployment Considerations
- **Staging Environment**: Higher sampling rates for debugging
- **Production Environment**: Lower sampling rates for performance
- **Development Environment**: Full instrumentation with debug logging
- **Resource Allocation**: Account for telemetry overhead in resource planning

## Next Steps

1. **Phase 1 Implementation**: Start with basic OpenTelemetry setup
2. **Honeycomb Configuration**: Set up Honeycomb.io account and API keys
3. **Development Testing**: Verify instrumentation in local environment
4. **Progressive Enhancement**: Add business-specific instrumentation iteratively
5. **Production Deployment**: Deploy with appropriate sampling and monitoring

This architecture provides a solid foundation for comprehensive observability while maintaining code simplicity and performance.
