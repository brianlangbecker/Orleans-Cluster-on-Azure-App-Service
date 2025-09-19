# Orleans Shopping Cart - Local Development Setup

This guide will help you set up the Orleans Shopping Cart application with Python microservice integration on macOS using Homebrew.

## Prerequisites

Before running the Orleans shopping cart application, you'll need to install the required development tools.

### 1. Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install .NET 9 SDK

The application requires .NET 9 SDK. Install it using Homebrew:

```bash
# Install .NET 9 SDK
brew install --cask dotnet

# Verify installation
dotnet --version
```

You should see output like `9.0.xxx`. If you see an older version or get an error, you may need to update your PATH:

```bash
# Add to your shell profile (~/.zshrc, ~/.bash_profile, etc.)
export PATH="/usr/local/share/dotnet:$PATH"

# Reload your shell
source ~/.zshrc  # or source ~/.bash_profile
```

### 3. Install Python 3 (for the inventory microservice)

```bash
# Install Python 3
brew install python3

# Verify installation
python3 --version
```

### 4. Verify Git is Available

```bash
# Git should be available, but if not:
brew install git
```

## Application Architecture

This Orleans application demonstrates a **polyglot microservices architecture**:

- **Orleans Silo** (C#/.NET 9) - Main application with Blazor frontend
- **Python Inventory Service** (Python/FastAPI) - Microservice for inventory management
- **SQLite Database** (optional) - Local persistence alternative to in-memory storage

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/brianlangbecker/Orleans-Cluster-on-Azure-App-Service.git
cd Orleans-Cluster-on-Azure-App-Service
```

### 2. Start the Orleans Application

```bash
# Start the main Orleans application
./run-orleans.sh start
```

The Orleans application will be available at: **http://localhost:5001**

### 3. Start the Python Inventory Service (Optional)

```bash
# Start the Python microservice
cd python-inventory-service
./run-python-inventory.sh start
```

The Python API will be available at: **http://localhost:8000**
- API Documentation: **http://localhost:8000/docs**

### 4. Test the Integration

```bash
# Test Orleans products (original implementation)
curl http://localhost:5001/api/test/orleans-products

# Test Python products (new microservice)
curl http://localhost:5001/api/test/python-products

# Compare both services
curl http://localhost:5001/api/test/compare
```

## Configuration Options

### Local Database (SQLite)

By default, the application uses in-memory storage. To enable SQLite persistence:

1. Edit `Silo/appsettings.Development.json`:
   ```json
   {
     "UseLocalDatabase": true
   }
   ```

2. Restart the Orleans application:
   ```bash
   ./run-orleans.sh restart
   ```

### Service URLs

- **Orleans Web App**: http://localhost:5001
- **Python API**: http://localhost:8000
- **Python API Docs**: http://localhost:8000/docs

## Service Management

### Orleans Application

```bash
./run-orleans.sh start      # Start the application
./run-orleans.sh stop       # Stop the application
./run-orleans.sh restart    # Restart the application
./run-orleans.sh status     # Check application status
./run-orleans.sh logs       # View application logs
```

### Python Inventory Service

```bash
cd python-inventory-service
./run-python-inventory.sh start      # Start the service
./run-python-inventory.sh stop       # Stop the service
./run-python-inventory.sh restart    # Restart the service
./run-python-inventory.sh status     # Check service status
./run-python-inventory.sh logs       # View service logs
./run-python-inventory.sh setup      # Setup Python environment only
```

## Troubleshooting

### Common Issues

1. **Port 5000 Conflict (AirPlay)**
   - macOS AirPlay uses port 5000
   - The Orleans app runs on port 5001 to avoid conflicts

2. **.NET Version Issues**
   ```bash
   # Check installed SDKs
   dotnet --list-sdks
   
   # If you see older versions, update
   brew upgrade --cask dotnet
   ```

3. **Python Virtual Environment Issues**
   ```bash
   cd python-inventory-service
   # Clean and recreate virtual environment
   rm -rf venv
   ./run-python-inventory.sh setup
   ```

4. **Build Errors**
   ```bash
   # Clean and rebuild
   dotnet clean
   dotnet restore
   dotnet build
   ```

### Verify Installation

```bash
# Check all required tools
dotnet --version          # Should be 9.0.xxx
python3 --version         # Should be 3.x.x
git --version             # Should be available
brew --version            # Should be available
```

## Development Features

### What You Can Do

1. **Shopping Cart Operations**
   - Browse products by category
   - Add items to cart
   - View cart contents
   - Manage inventory

2. **Service Comparison**
   - Compare Orleans grains vs Python microservice
   - Test distributed service communication
   - Observe service health and performance

3. **Local Development**
   - Run entirely offline
   - Use SQLite for persistence
   - Hot reload for both C# and Python code

### Architecture Benefits

- **Language Diversity**: Mix C# Orleans with Python microservices
- **Independent Scaling**: Scale services separately
- **Service Isolation**: Failures in one service don't crash others
- **Technology Choice**: Use the best tool for each job
- **API-First Design**: Clear service boundaries

## Next Steps

- **OpenTelemetry Integration**: Add distributed tracing
- **Docker Deployment**: Containerize both services
- **Azure Deployment**: Deploy to Azure App Service
- **Additional Microservices**: Add more Python/Node.js services

## Support

If you encounter issues:

1. Check the application logs: `./run-orleans.sh logs`
2. Verify all prerequisites are installed
3. Ensure ports 5001 and 8000 are available
4. Check the GitHub repository for updates

## Links

- **GitHub Repository**: https://github.com/brianlangbecker/Orleans-Cluster-on-Azure-App-Service
- **Orleans Documentation**: https://docs.microsoft.com/en-us/dotnet/orleans/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/