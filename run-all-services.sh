#!/bin/bash

# Combined Orleans + Python Inventory Services Runner
# This script manages both the Orleans application and Python inventory microservice

set -e  # Exit on any error

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORLEANS_SCRIPT="$PROJECT_DIR/run-orleans.sh"
PYTHON_SCRIPT="$PROJECT_DIR/python-inventory-service/run-python-inventory.sh"
REACT_SCRIPT="$PROJECT_DIR/shopping-cart-ui/run-react-ui.sh"
OTEL_SCRIPT="$PROJECT_DIR/run-otel-collector.sh"
ORLEANS_PORT=5001
PYTHON_PORT=8000
REACT_PORT=3000
OTEL_PORT=4318

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_service() {
    echo -e "${CYAN}[SERVICE]${NC} $1"
}

# Check if services are running
check_orleans_running() {
    if lsof -i :$ORLEANS_PORT >/dev/null 2>&1; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

check_python_running() {
    if lsof -i :$PYTHON_PORT >/dev/null 2>&1; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

check_react_running() {
    if lsof -i :$REACT_PORT >/dev/null 2>&1; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

check_otel_running() {
    if lsof -i :$OTEL_PORT >/dev/null 2>&1; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

# Check if services are healthy
check_orleans_healthy() {
    curl -s http://localhost:$ORLEANS_PORT >/dev/null 2>&1
}

check_python_healthy() {
    curl -s http://localhost:$PYTHON_PORT/health >/dev/null 2>&1
}

check_react_healthy() {
    curl -s http://localhost:$REACT_PORT >/dev/null 2>&1
}

check_otel_healthy() {
    curl -s http://localhost:$OTEL_PORT/health >/dev/null 2>&1
}

# Start all services
start_services() {
    log_info "Starting Orleans Shopping Cart with Python Inventory Microservice and React UI"
    echo ""

    # Verify scripts exist
    if [ ! -f "$ORLEANS_SCRIPT" ]; then
        log_error "Orleans script not found: $ORLEANS_SCRIPT"
        exit 1
    fi

    if [ ! -f "$PYTHON_SCRIPT" ]; then
        log_error "Python script not found: $PYTHON_SCRIPT"
        exit 1
    fi

    if [ ! -f "$REACT_SCRIPT" ]; then
        log_error "React script not found: $REACT_SCRIPT"
        exit 1
    fi

    if [ ! -f "$OTEL_SCRIPT" ]; then
        log_error "OpenTelemetry Collector script not found: $OTEL_SCRIPT"
        exit 1
    fi

    # Check if services are already running
    local orleans_running=false
    local python_running=false
    local react_running=false
    local otel_running=false

    if check_orleans_running; then
        log_warning "Orleans application is already running on port $ORLEANS_PORT"
        orleans_running=true
    fi

    if check_python_running; then
        log_warning "Python inventory service is already running on port $PYTHON_PORT"
        python_running=true
    fi

    if check_react_running; then
        log_warning "React UI is already running on port $REACT_PORT"
        react_running=true
    fi

    if check_otel_running; then
        log_warning "OpenTelemetry Collector is already running on port $OTEL_PORT"
        otel_running=true
    fi

    if [ "$orleans_running" = true ] && [ "$python_running" = true ] && [ "$react_running" = true ] && [ "$otel_running" = true ]; then
        log_warning "All services are already running"
        show_status
        exit 0
    fi

    # Start OpenTelemetry Collector first
    if [ "$otel_running" = false ]; then
        log_service "Starting OpenTelemetry Collector..."
        "$OTEL_SCRIPT" start

        # Wait for collector to be ready
        log_info "Waiting for OpenTelemetry Collector to initialize..."
        local count=0
        local timeout=30

        while [ $count -lt $timeout ]; do
            if check_otel_healthy; then
                log_success "OpenTelemetry Collector is ready"
                break
            fi
            sleep 1
            count=$((count + 1))
            echo -n "."
        done
        echo ""

        if [ $count -eq $timeout ]; then
            log_error "OpenTelemetry Collector failed to start within $timeout seconds"
            exit 1
        fi
    fi

    # Start Python inventory service
    if [ "$python_running" = false ]; then
        log_service "Starting Python Inventory Service..."
        "$PYTHON_SCRIPT" start

        # Wait for Python service to be ready
        log_info "Waiting for Python service to initialize..."
        local count=0
        local timeout=30

        while [ $count -lt $timeout ]; do
            if check_python_healthy; then
                log_success "Python Inventory Service is ready"
                break
            fi
            sleep 1
            count=$((count + 1))
            echo -n "."
        done
        echo ""

        if [ $count -eq $timeout ]; then
            log_error "Python service failed to start within $timeout seconds"
            exit 1
        fi
    fi

    # Start Orleans application
    if [ "$orleans_running" = false ]; then
        log_service "Starting Orleans Application..."
        "$ORLEANS_SCRIPT" start

        # Wait for Orleans to be ready
        log_info "Waiting for Orleans application to initialize..."
        local count=0
        local timeout=45

        while [ $count -lt $timeout ]; do
            if check_orleans_healthy; then
                log_success "Orleans Application is ready"
                break
            fi
            sleep 1
            count=$((count + 1))
            echo -n "."
        done
        echo ""

        if [ $count -eq $timeout ]; then
            log_error "Orleans application failed to start within $timeout seconds"
            exit 1
        fi
    fi

    # Start React UI
    if [ "$react_running" = false ]; then
        log_service "Starting React UI..."
        "$REACT_SCRIPT" start

        # Wait for React to be ready
        log_info "Waiting for React UI to initialize..."
        local count=0
        local timeout=30

        while [ $count -lt $timeout ]; do
            if check_react_healthy; then
                log_success "React UI is ready"
                break
            fi
            sleep 1
            count=$((count + 1))
            echo -n "."
        done
        echo ""

        if [ $count -eq $timeout ]; then
            log_error "React UI failed to start within $timeout seconds"
            exit 1
        fi
    fi

    # Test integration
    log_info "Testing service integration..."
    sleep 2

    if curl -s http://localhost:$ORLEANS_PORT/api/test/compare >/dev/null 2>&1; then
        log_success "Service integration test passed"
    else
        log_warning "Service integration test failed (services may still be starting)"
    fi

    echo ""
    log_success "🎉 All services are running successfully!"
    echo ""
    show_urls
}

# Stop all services
stop_services() {
    log_info "Stopping all services..."

    # Stop React UI first
    if [ -f "$REACT_SCRIPT" ]; then
        log_service "Stopping React UI..."
        "$REACT_SCRIPT" stop 2>/dev/null || true
    fi

    # Stop Orleans next (it may depend on Python service)
    if [ -f "$ORLEANS_SCRIPT" ]; then
        log_service "Stopping Orleans Application..."
        "$ORLEANS_SCRIPT" stop 2>/dev/null || true
    fi

    # Stop Python service
    if [ -f "$PYTHON_SCRIPT" ]; then
        log_service "Stopping Python Inventory Service..."
        "$PYTHON_SCRIPT" stop 2>/dev/null || true
    fi

    # Stop OpenTelemetry Collector last
    if [ -f "$OTEL_SCRIPT" ]; then
        log_service "Stopping OpenTelemetry Collector..."
        "$OTEL_SCRIPT" stop 2>/dev/null || true
    fi

    # Force kill any remaining processes on the ports
    local react_pids=$(lsof -t -i :$REACT_PORT 2>/dev/null || true)
    local orleans_pids=$(lsof -t -i :$ORLEANS_PORT 2>/dev/null || true)
    local python_pids=$(lsof -t -i :$PYTHON_PORT 2>/dev/null || true)
    local otel_pids=$(lsof -t -i :$OTEL_PORT 2>/dev/null || true)

    if [ -n "$react_pids" ]; then
        kill $react_pids 2>/dev/null || true
    fi

    if [ -n "$orleans_pids" ]; then
        kill $orleans_pids 2>/dev/null || true
    fi

    if [ -n "$python_pids" ]; then
        kill $python_pids 2>/dev/null || true
    fi

    if [ -n "$otel_pids" ]; then
        kill $otel_pids 2>/dev/null || true
    fi

    sleep 2
    log_success "All services stopped"
}

# Restart all services
restart_services() {
    log_info "Restarting all services..."
    stop_services
    sleep 3
    start_services
}

# Show status of all services
show_status() {
    echo ""
    log_info "Service Status Report"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # React UI status
    if check_react_running; then
        if check_react_healthy; then
            log_success "React UI: RUNNING & HEALTHY"
            echo "  URL: http://localhost:$REACT_PORT"
        else
            log_warning "React UI: RUNNING but not responding"
        fi
    else
        log_error "React UI: NOT RUNNING"
    fi

    # Orleans status
    if check_orleans_running; then
        if check_orleans_healthy; then
            log_success "Orleans Application: RUNNING & HEALTHY"
            echo "  URL: http://localhost:$ORLEANS_PORT"
        else
            log_warning "Orleans Application: RUNNING but not responding"
        fi
    else
        log_error "Orleans Application: NOT RUNNING"
    fi

    # Python status
    if check_python_running; then
        if check_python_healthy; then
            log_success "Python Inventory Service: RUNNING & HEALTHY"
            echo "  URL: http://localhost:$PYTHON_PORT"
            echo "  API Docs: http://localhost:$PYTHON_PORT/docs"
        else
            log_warning "Python Inventory Service: RUNNING but not responding"
        fi
    else
        log_error "Python Inventory Service: NOT RUNNING"
    fi

    echo ""

    # Integration status
    if check_orleans_running && check_python_running; then
        if curl -s http://localhost:$ORLEANS_PORT/api/test/compare >/dev/null 2>&1; then
            log_success "Service Integration: WORKING"
            echo "  Test: http://localhost:$ORLEANS_PORT/api/test/compare"
        else
            log_warning "Service Integration: NOT RESPONDING"
        fi
    else
        log_warning "Service Integration: CANNOT TEST (services not running)"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Show service URLs
show_urls() {
    echo "🌐 Service URLs:"
    echo "  React UI:               http://localhost:3000"
    echo "  Orleans API:            http://localhost:$ORLEANS_PORT"
    echo "  Orleans API Test:       http://localhost:$ORLEANS_PORT/api/test/compare"
    echo "  Python API:             http://localhost:$PYTHON_PORT"
    echo "  Python API Docs:        http://localhost:$PYTHON_PORT/docs"
    echo "  OpenTelemetry:          http://localhost:$OTEL_PORT"
    echo ""
    echo "📋 Management Commands:"
    echo "  View logs:              $0 logs"
    echo "  Check status:           $0 status"
    echo "  Stop services:          $0 stop"
    echo "  Restart services:       $0 restart"
    echo ""
}

# Show logs from all services
show_logs() {
    echo ""
    log_info "Recent logs from all services"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo ""
    echo "🔹 React UI Logs (last 10 lines):"
    if [ -f "$PROJECT_DIR/shopping-cart-ui/react-ui.log" ]; then
        tail -10 "$PROJECT_DIR/shopping-cart-ui/react-ui.log"
    else
        echo "  No React UI log file found"
    fi

    echo ""
    echo "🔹 Orleans Application Logs (last 10 lines):"
    if [ -f "$PROJECT_DIR/Silo/orleans-app.log" ]; then
        tail -10 "$PROJECT_DIR/Silo/orleans-app.log"
    else
        echo "  No Orleans log file found"
    fi

    echo ""
    echo "🔹 Python Inventory Service Logs (last 10 lines):"
    if [ -f "$PROJECT_DIR/python-inventory-service/inventory-service.log" ]; then
        tail -10 "$PROJECT_DIR/python-inventory-service/inventory-service.log"
    else
        echo "  No Python log file found"
    fi

    echo ""
    echo "To follow logs in real-time:"
    echo "  React UI: tail -f $PROJECT_DIR/shopping-cart-ui/react-ui.log"
    echo "  Orleans:  tail -f $PROJECT_DIR/Silo/orleans-app.log"
    echo "  Python:   tail -f $PROJECT_DIR/python-inventory-service/inventory-service.log"
    echo ""
}

# Test service integration
test_integration() {
    log_info "Testing service integration..."

    if ! check_orleans_running || ! check_python_running; then
        log_error "Both services must be running for integration tests"
        log_info "Start services with: $0 start"
        exit 1
    fi

    echo ""
    echo "🧪 Running Integration Tests:"
    echo ""

    # Test Orleans products
    echo "1. Testing Orleans products endpoint..."
    if curl -s http://localhost:$ORLEANS_PORT/api/test/orleans-products | head -c 100 >/dev/null; then
        log_success "Orleans products endpoint: OK"
    else
        log_error "Orleans products endpoint: FAILED"
    fi

    # Test Python health
    echo "2. Testing Python health endpoint..."
    if curl -s http://localhost:$PYTHON_PORT/health >/dev/null; then
        log_success "Python health endpoint: OK"
    else
        log_error "Python health endpoint: FAILED"
    fi

    # Test service comparison
    echo "3. Testing service comparison endpoint..."
    if curl -s http://localhost:$ORLEANS_PORT/api/test/compare >/dev/null; then
        log_success "Service comparison endpoint: OK"
    else
        log_error "Service comparison endpoint: FAILED"
    fi

    echo ""
    log_success "Integration test completed"
    echo ""
    echo "🔍 View detailed results:"
    echo "  curl http://localhost:$ORLEANS_PORT/api/test/compare | jq"
    echo ""
}

# Main script logic
case "${1:-start}" in
    "start")
        start_services
        ;;

    "stop")
        stop_services
        ;;

    "restart")
        restart_services
        ;;

    "status")
        show_status
        ;;

    "logs")
        show_logs
        ;;

    "test")
        test_integration
        ;;

    "urls")
        show_urls
        ;;

    "help"|"--help"|"-h")
        echo "Orleans + Python Microservices Manager"
        echo ""
        echo "This script manages both the Orleans Shopping Cart application"
        echo "and the Python Inventory microservice together."
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start both services (default)"
        echo "  stop      Stop both services"
        echo "  restart   Restart both services"
        echo "  status    Show status of both services"
        echo "  logs      Show recent logs from both services"
        echo "  test      Run integration tests"
        echo "  urls      Show service URLs"
        echo "  help      Show this help message"
        echo ""
        echo "Services:"
        echo "  Orleans Application:     http://localhost:$ORLEANS_PORT"
        echo "  Python Inventory API:    http://localhost:$PYTHON_PORT"
        echo ""
        echo "This demonstrates a polyglot microservices architecture with"
        echo "C# Orleans + Python FastAPI integration."
        ;;

    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
