"""
OpenTelemetry configuration for Python Inventory Service
Layer 2: Foundation auto-instrumentation with OTLP export to collector
"""

import os
import logging
from typing import Optional

from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter

# Auto-instrumentation imports (imported dynamically to handle missing dependencies)
try:
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    
try:
    from opentelemetry.instrumentation.httpx import HTTPXInstrumentor
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    
try:
    from opentelemetry.instrumentation.aiohttp_client import AioHttpClientInstrumentor
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    
try:
    from opentelemetry.instrumentation.logging import LoggingInstrumentor
    LOGGING_AVAILABLE = True
except ImportError:
    LOGGING_AVAILABLE = False

logger = logging.getLogger(__name__)


def get_telemetry_config() -> dict:
    """Get OpenTelemetry configuration from environment variables."""
    return {
        "service_name": os.getenv("OTEL_SERVICE_NAME", "python-inventory"),
        "service_version": os.getenv("OTEL_SERVICE_VERSION", "1.0.0"),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "honeycomb_endpoint": os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://api.honeycomb.io"),
        "honeycomb_api_key": os.getenv("HONEYCOMB_API_KEY"),
        "enable_debug": os.getenv("OTEL_DEBUG", "false").lower() == "true",
        "service_instance_id": os.getenv("HOSTNAME", os.uname().nodename),
    }


def setup_telemetry() -> Optional[tuple]:
    """
    Initialize OpenTelemetry with auto-instrumentation.
    Returns (tracer, meter) tuple if successful, None if failed.
    """
    try:
        config = get_telemetry_config()
        
        logger.info(f"🔭 Initializing OpenTelemetry for {config['service_name']}")
        
        # Create resource with service information
        resource = Resource.create({
            "service.name": config["service_name"],
            "service.version": config["service_version"],
            "service.instance.id": config["service_instance_id"],
            "deployment.environment": config["environment"],
            "app.type": "fastapi",
            "app.framework": "python",
            "app.language": "python",
        })
        
        # Configure tracing
        trace_provider = TracerProvider(resource=resource)
        
        # OTLP trace exporter to Honeycomb
        headers = {}
        if config["honeycomb_api_key"]:
            headers["x-honeycomb-team"] = config["honeycomb_api_key"]
        
        otlp_trace_exporter = OTLPSpanExporter(
            endpoint=f"{config['honeycomb_endpoint']}/v1/traces",
            headers=headers,
        )
        
        trace_provider.add_span_processor(
            BatchSpanProcessor(
                otlp_trace_exporter,
                max_queue_size=2048,
                max_export_batch_size=512,
                export_timeout_millis=30000,
                schedule_delay_millis=5000,
            )
        )
        
        trace.set_tracer_provider(trace_provider)
        
        # Configure metrics
        metric_headers = {}
        if config["honeycomb_api_key"]:
            metric_headers["x-honeycomb-team"] = config["honeycomb_api_key"]
            
        otlp_metric_exporter = OTLPMetricExporter(
            endpoint=f"{config['honeycomb_endpoint']}/v1/metrics",
            headers=metric_headers,
        )
        
        metric_reader = PeriodicExportingMetricReader(
            exporter=otlp_metric_exporter,
            export_interval_millis=10000,  # 10 seconds
            export_timeout_millis=30000,   # 30 seconds
        )
        
        metric_provider = MeterProvider(
            resource=resource,
            metric_readers=[metric_reader]
        )
        
        metrics.set_meter_provider(metric_provider)
        
        # Get tracer and meter instances
        tracer = trace.get_tracer(__name__, config["service_version"])
        meter = metrics.get_meter(__name__, config["service_version"])
        
        logger.info("✅ OpenTelemetry tracing and metrics configured")
        
        return tracer, meter
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize OpenTelemetry: {e}")
        return None


def setup_auto_instrumentation(app) -> bool:
    """
    Set up automatic instrumentation for FastAPI and HTTP clients.
    Returns True if successful, False otherwise.
    """
    try:
        config = get_telemetry_config()
        
        logger.info("🔧 Setting up auto-instrumentation...")
        
        # FastAPI auto-instrumentation
        if FASTAPI_AVAILABLE:
            FastAPIInstrumentor.instrument_app(
                app,
                server_request_hook=None,  # Could add custom request enrichment
                client_request_hook=None,  # Could add custom response enrichment
            )
            logger.info("✅ FastAPI auto-instrumentation enabled")
        else:
            logger.warning("⚠️ FastAPI instrumentation not available")
        
        # HTTP client instrumentation
        if HTTPX_AVAILABLE:
            HTTPXInstrumentor().instrument()
            logger.info("✅ HTTPX client auto-instrumentation enabled")
        else:
            logger.warning("⚠️ HTTPX instrumentation not available")
        
        # AIOHTTP client instrumentation  
        if AIOHTTP_AVAILABLE:
            AioHttpClientInstrumentor().instrument()
            logger.info("✅ AIOHTTP client auto-instrumentation enabled")
        else:
            logger.warning("⚠️ AIOHTTP client instrumentation not available")
        
        # Logging instrumentation
        if LOGGING_AVAILABLE:
            LoggingInstrumentor().instrument(
                set_logging_format=True,
                log_level=logging.INFO if not config["enable_debug"] else logging.DEBUG
            )
            logger.info("✅ Logging auto-instrumentation enabled")
        else:
            logger.warning("⚠️ Logging instrumentation not available")
        
        logger.info("🎉 Auto-instrumentation setup complete")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to setup auto-instrumentation: {e}")
        return False


def create_custom_metrics(meter):
    """Create custom business metrics for inventory service."""
    try:
        # Business metrics
        inventory_operations_counter = meter.create_counter(
            name="inventory_operations_total",
            description="Total number of inventory operations",
            unit="1"
        )
        
        product_count_gauge = meter.create_up_down_counter(
            name="inventory_products_total", 
            description="Current number of products in inventory",
            unit="1"
        )
        
        request_duration_histogram = meter.create_histogram(
            name="inventory_request_duration_seconds",
            description="Duration of inventory service requests",
            unit="s"
        )
        
        orleans_integration_counter = meter.create_counter(
            name="orleans_integration_calls_total",
            description="Total calls to Orleans service",
            unit="1"
        )
        
        logger.info("📊 Custom metrics created")
        
        return {
            "operations": inventory_operations_counter,
            "product_count": product_count_gauge, 
            "request_duration": request_duration_histogram,
            "orleans_calls": orleans_integration_counter,
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create custom metrics: {e}")
        return {}


# Global telemetry instances
_tracer = None
_meter = None
_custom_metrics = {}


def get_tracer():
    """Get the global tracer instance."""
    global _tracer
    if _tracer is None:
        logger.warning("Tracer not initialized, using no-op tracer")
        return trace.get_tracer(__name__)
    return _tracer


def get_meter():
    """Get the global meter instance.""" 
    global _meter
    if _meter is None:
        logger.warning("Meter not initialized, using no-op meter")
        return metrics.get_meter(__name__)
    return _meter


def get_custom_metrics():
    """Get the custom metrics dictionary."""
    return _custom_metrics


def initialize_telemetry(app):
    """
    Initialize all telemetry components for the FastAPI app.
    Call this once during app startup.
    """
    global _tracer, _meter, _custom_metrics
    
    try:
        logger.info("🚀 Initializing telemetry for Python Inventory Service...")
        
        # Setup core telemetry
        telemetry_result = setup_telemetry()
        if telemetry_result:
            _tracer, _meter = telemetry_result
        else:
            logger.warning("⚠️ Core telemetry setup failed, continuing without telemetry")
            return False
        
        # Setup auto-instrumentation
        auto_success = setup_auto_instrumentation(app)
        if not auto_success:
            logger.warning("⚠️ Auto-instrumentation setup failed, continuing with manual telemetry")
        
        # Create custom metrics
        _custom_metrics = create_custom_metrics(_meter)
        
        config = get_telemetry_config()
        logger.info(f"🎉 Telemetry initialization complete for {config['service_name']}")
        logger.info(f"📡 Sending telemetry to Honeycomb at {config['honeycomb_endpoint']}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Telemetry initialization failed: {e}")
        return False


def shutdown_telemetry():
    """Shutdown telemetry providers gracefully."""
    try:
        logger.info("🔄 Shutting down telemetry...")
        
        # Shutdown trace provider
        trace_provider = trace.get_tracer_provider()
        if hasattr(trace_provider, 'shutdown'):
            trace_provider.shutdown()
        
        # Shutdown metric provider
        metric_provider = metrics.get_meter_provider() 
        if hasattr(metric_provider, 'shutdown'):
            metric_provider.shutdown()
        
        logger.info("✅ Telemetry shutdown complete")
        
    except Exception as e:
        logger.error(f"❌ Error during telemetry shutdown: {e}")