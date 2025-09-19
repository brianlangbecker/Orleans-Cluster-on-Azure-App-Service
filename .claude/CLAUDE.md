# Orleans Cluster Observability Demo Project

This project demonstrates observability features (metrics, logs, traces) across a full-stack hybrid deployment setup.

## Project Goals and Requirements

For complete project requirements, functional specifications, and use cases, see: [docs/Goals.md](../docs/Goals.md)

## Key Architecture Components

- **Frontend**: Deployed separately on Non-Azure cloud machine
- **Non-Azure Backend**: .NET Orleans application 
- **Azure Backend**: Python FastAPI inventory service (Azure App Services)
- **Database**: Shared Azure SQL/PostgreSQL database
- **Observability**: Honeycomb.io with OpenTelemetry instrumentation

## Current Status

The project currently has:
- .NET Orleans application (Silo)
- Python inventory microservice (FastAPI)
- Unified service management scripts
- Local development environment

## Next Steps

1. Implement comprehensive observability instrumentation across all components
2. Set up hybrid deployment (Non-Azure + Azure cloud)
3. Connect to shared Azure cloud database
4. Implement required use cases for demonstration

See [docs/Goals.md](../docs/Goals.md) for detailed requirements and 14 specific use cases to demonstrate.