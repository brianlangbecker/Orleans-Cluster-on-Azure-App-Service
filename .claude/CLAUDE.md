# Orleans Cluster Observability Demo Project

This project demonstrates observability features (metrics, logs, traces) across a full-stack hybrid deployment setup.

## Project Documentation

- **Project Goals and Requirements**: [docs/Goals.md](../docs/Goals.md) - Complete functional specifications and 14 use cases to demonstrate
- **Instrumentation Architecture**: [docs/Instrumentation-Architecture.md](../docs/Instrumentation-Architecture.md) - Comprehensive observability strategy using OpenTelemetry and Honeycomb.io

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

## Implementation Status

**Current Phase**: Planning and Architecture Design
- ✅ Project requirements documented
- ✅ Instrumentation architecture designed (6-layer observability strategy)
- 🔄 Ready to begin Phase 1: Foundation Setup (Frontend & Backend OpenTelemetry integration)

See project documentation above for detailed requirements and implementation strategy.