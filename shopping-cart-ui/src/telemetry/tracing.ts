import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

export function setupTracing() {
  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'shopping-cart-ui',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
  });

  // Configure OTLP exporter
  const otlpExporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  });

  // Use BatchSpanProcessor for better performance
  provider.addSpanProcessor(new BatchSpanProcessor(otlpExporter));

  // Register automatic instrumentations
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          enabled: true,
          propagateTraceHeaderCorsUrls: [
            'http://localhost:5001',
            'http://localhost:8000',
          ],
        },
      }),
    ],
  });

  // Initialize the provider
  provider.register({
    contextManager: new ZoneContextManager(),
  });

  return provider;
}
