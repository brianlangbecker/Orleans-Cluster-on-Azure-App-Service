import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ZoneContextManager } from '@opentelemetry/context-zone';

let isInitialized = false;

export function setupTracing() {
  // Prevent multiple initializations
  if (isInitialized) {
    return;
  }

  try {
    // Create resource with service information
    const resource = Resource.default().merge(
      new Resource({
        [ATTR_SERVICE_NAME]: 'shopping-cart-ui',
        [ATTR_SERVICE_VERSION]: '1.0.0',
        'deployment.environment': 'development',
        'service.instance.id': window.location.hostname,
        'app.type': 'react-spa',
        'app.framework': 'react',
        'ui.library': 'react'
      })
    );

    // Create tracer provider
    const provider = new WebTracerProvider({
      resource: resource,
    });

    // Configure OTLP exporter to send to OpenTelemetry Collector
    const exporter = new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
      headers: {}
    });

    // Add batch span processor
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));

    // Register the provider
    provider.register({
      contextManager: new ZoneContextManager(),
    });

    // Auto-instrument common web APIs
    registerInstrumentations({
      instrumentations: [
        getWebAutoInstrumentations({
          '@opentelemetry/instrumentation-document-load': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-user-interaction': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-fetch': {
            enabled: true,
            propagateTraceHeaderCorsUrls: [
              'http://localhost:5001',
              'http://localhost:8000',
              /^http:\/\/localhost:\d+$/,
            ],
          },
          '@opentelemetry/instrumentation-xml-http-request': {
            enabled: true,
            propagateTraceHeaderCorsUrls: [
              'http://localhost:5001',
              'http://localhost:8000',
              /^http:\/\/localhost:\d+$/,
            ],
          },
        }),
      ],
    });

    isInitialized = true;
    console.log('OpenTelemetry tracing initialized for React UI');
  } catch (error) {
    console.warn('Failed to initialize OpenTelemetry tracing:', error);
  }
}