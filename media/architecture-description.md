# Modern React + Orleans Shopping Cart Architecture

## Current Architecture (Updated Implementation)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 USER BROWSER                                   │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │ HTTP/HTTPS
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────────┐
│                          REACT FRONTEND (Port 3000)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Shop Page     │  │  Products Page  │  │   Cart Page     │                │
│  │                 │  │                 │  │                 │                │
│  │ • Browse items  │  │ • CRUD Products │  │ • View cart     │                │
│  │ • Add to cart   │  │ • Random data   │  │ • Update qty    │                │
│  │ • Real-time     │  │ • Delete items  │  │ • Remove items  │                │
│  │   cart count    │  │                 │  │ • Checkout UI   │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    CART CONTEXT (Global State)                         │   │
│  │  • Real-time cart count synchronization                               │   │
│  │  • Shared across all components                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│  Technologies: React, TypeScript, Material-UI, Context API                    │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │ REST API Calls
                                  │ /api/shop/*
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────────┐
│                        ORLEANS BACKEND (Port 5001)                            │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         API CONTROLLERS                                │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐                    ┌─────────────────┐            │   │
│  │  │  ShopController │                    │ Other Controllers│            │   │
│  │  │                 │                    │                 │            │   │
│  │  │ • GET products  │                    │ • Health checks │            │   │
│  │  │ • POST products │                    │ • Diagnostics   │            │   │
│  │  │ • DELETE products│                   │                 │            │   │
│  │  │ • Cart operations│                   │                 │            │   │
│  │  └─────────────────┘                    └─────────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
│                                    │ Grain Calls                               │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          ORLEANS GRAINS                                │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │  ProductGrain   │  │ InventoryGrain  │  │ShoppingCartGrain│        │   │
│  │  │                 │  │                 │  │                 │        │   │
│  │  │ • Product CRUD  │  │ • Category-     │  │ • Add items     │        │   │
│  │  │ • State mgmt    │  │   specific      │  │ • Update qty    │        │   │
│  │  │ • Persistence   │  │   inventory     │  │ • Remove items  │        │   │
│  │  │                 │  │ • Product lists │  │ • Clear cart    │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│  Technologies: .NET 9, Orleans, ASP.NET Core, Entity Framework                │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │ HTTP Calls
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────────┐
│                    PYTHON INVENTORY SERVICE (Port 8000)                       │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          FASTAPI ENDPOINTS                             │   │
│  │                                                                         │   │
│  │  • GET /products - Product catalog                                     │   │
│  │  • Health monitoring                                                   │   │
│  │  • OpenAPI documentation                                               │   │
│  │  • Integration testing support                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│  Technologies: Python, FastAPI, Uvicorn, OpenTelemetry                        │
└────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         OBSERVABILITY & MONITORING                             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    OPENTELEMETRY COLLECTOR                             │    │
│  │                                                                         │    │
│  │  • Receives traces from all services                                   │    │
│  │  • Processes and exports to Honeycomb                                  │    │
│  │  • Distributed tracing correlation                                     │    │
│  │  • Performance monitoring                                              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  Technologies: OpenTelemetry, Honeycomb, Docker                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

### Frontend (React on Port 3000)
- **Modern React SPA** with TypeScript and Material-UI
- **Global Cart Context** for real-time state synchronization
- **Professional UI/UX** with loading states and animations
- **Full CRUD Operations** for products and shopping cart
- **Responsive Design** that works on all devices

### Backend (Orleans on Port 5001)
- **Distributed Grain Architecture** with automatic scaling
- **Category-Specific Inventory Management** for proper data organization
- **RESTful API Controllers** serving the React frontend
- **Persistent State Management** with automatic grain lifecycle
- **OpenTelemetry Integration** for comprehensive observability

### Microservices Integration
- **Python FastAPI Service** for additional inventory operations
- **Polyglot Architecture** demonstrating language interoperability
- **Health Monitoring** and service discovery

### Observability
- **End-to-End Tracing** across React, Orleans, and Python services
- **Real-Time Monitoring** with Honeycomb integration
- **Performance Analytics** and error tracking

## Data Flow

1. **User Interaction**: User interacts with React UI (port 3000)
2. **API Calls**: React makes REST calls to Orleans API (port 5001)
3. **Grain Processing**: Orleans controllers invoke appropriate grains
4. **State Management**: Grains manage distributed state with persistence
5. **Service Integration**: Orleans may call Python service for additional data
6. **Response**: Data flows back through the chain to update React UI
7. **Real-Time Updates**: Cart context ensures all components stay synchronized
8. **Observability**: All operations are traced via OpenTelemetry
