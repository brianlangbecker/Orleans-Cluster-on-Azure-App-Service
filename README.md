# Microsoft Orleans: Shopping Cart App with React Frontend

[![Deploy to Azure App Service](https://github.com/Azure-Samples/Orleans-Cluster-on-Azure-App-Service/actions/workflows/deploy.yml/badge.svg)](https://github.com/Azure-Samples/Orleans-Cluster-on-Azure-App-Service/actions/workflows/deploy.yml)

A modern shopping cart application built with Microsoft Orleans and React. This app demonstrates a polyglot microservices architecture with:

-   **React Frontend**: Modern, responsive UI built with TypeScript and Material-UI
-   **Orleans Backend**: Scalable, distributed .NET application
-   **Python Inventory Service**: FastAPI-based microservice

## 🚀 Quick Start

1. **Clone and start**: `./run-all-services.sh start`
2. **Open application**: http://localhost:3000
3. **Start shopping!** Browse products, add to cart, and test the full experience

## Features

### Frontend (React)

-   Modern React with TypeScript
-   Material-UI (MUI) components for a polished UI
-   React Query for efficient data fetching and caching
-   OpenTelemetry instrumentation for frontend monitoring
-   Responsive design that works on all devices

### Backend (Orleans)

-   [.NET 9](https://docs.microsoft.com/dotnet/core/whats-new/dotnet-9)
-   [Orleans: Grain persistence](https://docs.microsoft.com/dotnet/orleans/grains/grain-persistence)
    -   [Azure Storage grain persistence](https://docs.microsoft.com/dotnet/orleans/grains/grain-persistence/azure-storage)
-   [Orleans: Cluster management](https://docs.microsoft.com/dotnet/orleans/implementation/cluster-management)
-   [Orleans: Code generation](https://docs.microsoft.com/dotnet/orleans/grains/code-generation)

### Inventory Service (Python)

-   FastAPI-based RESTful API
-   OpenAPI documentation
-   Health monitoring
-   Integration with Orleans backend

### Infrastructure

-   [Azure Bicep](https://docs.microsoft.com/azure/azure-resource-manager/bicep)
-   [Azure App Service](https://docs.microsoft.com/azure/app-service/overview)
-   [GitHub Actions and .NET](https://docs.microsoft.com/dotnet/devops/github-actions-overview)

## Architecture

The modern React + Orleans shopping cart application is architected as follows:

```
┌─────────────────────────────────────────────────────────────────┐
│                          👤 User Browser                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP Requests
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ⚛️ React Frontend (Port 3000)                     │
│                    🎯 Main Application                          │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Shop Page   │  │Products Page│  │ Cart Page   │             │
│  │ Browse &    │  │ CRUD Ops &  │  │ Manage &    │             │
│  │ Add Items   │  │ Random Data │  │ Checkout    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│           🔄 Global Cart Context (Real-time Sync)               │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API Calls (/api/shop/*)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               🏛️ Orleans Backend (Port 5001)                   │
│                      API Server Only                           │
│                                                                 │
│  ┌─────────────────┐              ┌─────────────────────────┐   │
│  │ API Controllers │─────────────▶│    Orleans Grains       │   │
│  │ REST Endpoints  │              │                         │   │
│  └─────────────────┘              │ ┌─────┐ ┌─────┐ ┌─────┐ │   │
│                                   │ │Prod │ │Inv  │ │Cart │ │   │
│                                   │ │Grain│ │Grain│ │Grain│ │   │
│                                   │ └─────┘ └─────┘ └─────┘ │   │
│                                   └─────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          🐍 Python Service (Port 8000)                         │
│         FastAPI Inventory & Health Monitoring                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Traces & Metrics
                              ▼
                    ┌─────────────────────────┐
                    │  📊 OTEL Collector     │
                    │                        │
                    │  • Receives traces     │◀─── React Frontend
                    │  • Processes data      │◀─── Orleans Backend  
                    │  • Batches & exports   │◀─── Python Service
                    └─────────┬───────────────┘
                              │ OTLP Protocol
                              ▼
                    ┌─────────────────────────┐
                    │    🍯 Honeycomb.io     │
                    │                        │
                    │  • Distributed Tracing │
                    │  • Performance Analytics│
                    │  • Error Monitoring    │
                    │  • Service Maps        │
                    └─────────────────────────┘
```

### Architecture Overview

This application demonstrates a **modern polyglot microservices architecture** with:

-   **React Frontend (Port 3000)**: The main user interface with Material-UI components, global state management via React Context, and real-time cart synchronization
-   **Orleans Backend (Port 5001)**: Distributed .NET application with grain-based architecture for scalable state management and business logic
-   **Python Microservice (Port 8000)**: FastAPI-based inventory service demonstrating polyglot integration
-   **OpenTelemetry Observability**: End-to-end distributed tracing and monitoring with Honeycomb integration

### Key Architectural Benefits

-   **Real-time Synchronization**: Cart state updates instantly across all UI components
-   **Distributed Scalability**: Orleans grains provide automatic scaling and fault tolerance
-   **Category-based Data Management**: Inventory organized by product categories for optimal performance
-   **Professional UX**: Loading states, animations, and error handling throughout
-   **Comprehensive Observability**: Full request tracing from React through Orleans to Python services

## Getting Started

### Prerequisites

-   A [GitHub account](https://github.com/join)
-   [Node.js 18 or later](https://nodejs.org)
-   [.NET 9 SDK or later](https://dotnet.microsoft.com/download/dotnet)
-   [Python 3.9 or later](https://www.python.org/downloads/)
-   The [Azure CLI](/cli/azure/install-azure-cli)
-   A code editor (recommended: [Visual Studio Code](https://code.visualstudio.com))

### Quickstart

1. Clone the repository:

    ```bash
    git clone https://github.com/Azure-Samples/Orleans-Cluster-on-Azure-App-Service.git orleans-on-app-service
    cd orleans-on-app-service
    ```

2. Start all services:
    ```bash
    ./run-all-services.sh start
    ```

This will start:

-   **React UI at http://localhost:3000** ← **Main Application**
-   Orleans API at http://localhost:5001 (backend API only)
-   Python API at http://localhost:8000 (API docs at http://localhost:8000/docs)

## 🚀 **Access the Application**

**Main Application**: http://localhost:3000

The React frontend provides the complete shopping cart experience with:

-   Product browsing and management
-   Shopping cart functionality
-   Real-time cart updates
-   Professional UI with Material-UI components

The Orleans API (port 5001) serves as the backend and is consumed by the React frontend.

### Service Management

The `run-all-services.sh` script provides several commands:

-   `start` - Start all services
-   `stop` - Stop all services
-   `status` - Check service status
-   `logs` - View service logs
-   `restart` - Restart all services
-   `test` - Run integration tests

## Project Structure

-   `/shopping-cart-ui` - React frontend application
-   `/Silo` - Orleans backend application
-   `/python-inventory-service` - Python inventory microservice
-   `/Abstractions` - Shared interfaces and models
-   `/Grains` - Orleans grain implementations

## Third-Party Dependencies

### Frontend

-   [React](https://reactjs.org)
-   [Material-UI (MUI)](https://mui.com)
-   [React Query](https://tanstack.com/query)
-   [OpenTelemetry JS](https://opentelemetry.io/docs/js/)

### Backend

-   [MudBlazor](https://github.com/MudBlazor/MudBlazor)
-   [Bogus](https://github.com/bchavez/Bogus)

### Inventory Service

-   [FastAPI](https://fastapi.tiangolo.com)
-   [Uvicorn](https://www.uvicorn.org)

## Resources

-   [Deploy Orleans to Azure App Service](https://aka.ms/orleans-on-app-service)
-   [React Documentation](https://react.dev)
-   [FastAPI Documentation](https://fastapi.tiangolo.com)
