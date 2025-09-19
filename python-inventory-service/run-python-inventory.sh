#!/bin/bash

# Python Inventory Service Runner
# This script manages the Python inventory microservice

set -e  # Exit on any error

# Configuration
SERVICE_DIR="/Users/brianlangbecker/Documents/GitHub/Orleans-Cluster-on-Azure-App-Service/python-inventory-service"
VENV_DIR="$SERVICE_DIR/venv"
LOG_FILE="$SERVICE_DIR/inventory-service.log"
PORT=8000
PID_FILE="$SERVICE_DIR/inventory-service.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if service is running
check_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0  # Running
        else
            rm -f "$PID_FILE"
            return 1  # Not running
        fi
    else
        return 1  # Not running
    fi
}

# Setup Python virtual environment
setup_venv() {
    log_info "Setting up Python virtual environment..."
    
    if [ ! -d "$VENV_DIR" ]; then
        python3 -m venv "$VENV_DIR"
        log_success "Virtual environment created"
    fi
    
    # Activate virtual environment
    source "$VENV_DIR/bin/activate"
    
    # Install/upgrade requirements
    log_info "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r "$SERVICE_DIR/requirements.txt"
    
    log_success "Python environment ready"
}

# Stop the service
stop_service() {
    log_info "Stopping Python Inventory Service..."
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            sleep 2
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # Kill any remaining processes on the port
    local pids=$(lsof -t -i :$PORT 2>/dev/null || true)
    if [ -n "$pids" ]; then
        kill $pids 2>/dev/null || true
    fi
    
    log_success "Service stopped"
}

# Start the service
start_service() {
    log_info "Starting Python Inventory Service..."
    
    # Change to service directory
    cd "$SERVICE_DIR"
    
    # Setup virtual environment
    setup_venv
    
    # Activate virtual environment
    source "$VENV_DIR/bin/activate"
    
    # Clear previous log
    > "$LOG_FILE"
    
    # Start the service
    nohup python -m uvicorn api:app --host 0.0.0.0 --port $PORT --reload > "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo $pid > "$PID_FILE"
    
    log_info "Service started with PID: $pid"
    log_info "Waiting for service to initialize..."
    
    # Wait for service to start (max 15 seconds)
    local timeout=15
    local count=0
    
    while [ $count -lt $timeout ]; do
        if curl -s http://localhost:$PORT/health >/dev/null 2>&1; then
            log_success "Python Inventory Service is running on http://localhost:$PORT"
            return 0
        fi
        
        # Check if process died
        if ! kill -0 $pid 2>/dev/null; then
            log_error "Service process died during startup"
            log_error "Check logs for details: tail $LOG_FILE"
            return 1
        fi
        
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    
    echo ""
    log_error "Service failed to start within $timeout seconds"
    log_error "Check logs for details: tail $LOG_FILE"
    return 1
}

# Show status
show_status() {
    if check_running; then
        local pid=$(cat "$PID_FILE")
        log_success "Python Inventory Service is running"
        echo "  PID: $pid"
        echo "  URL: http://localhost:$PORT"
        echo "  API Docs: http://localhost:$PORT/docs"
        echo "  Log: $LOG_FILE"
    else
        log_warning "Python Inventory Service is not running"
    fi
}

# Show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "--- Last 20 lines of service log ---"
        tail -20 "$LOG_FILE"
        echo ""
        echo "To follow logs in real-time: tail -f $LOG_FILE"
    else
        log_warning "Log file not found: $LOG_FILE"
    fi
}

# Main script logic
case "${1:-start}" in
    "start")
        log_info "Starting Python Inventory Service"
        
        # Check if already running
        if check_running; then
            log_warning "Service is already running on port $PORT"
            show_status
            exit 0
        fi
        
        # Verify Python is available
        if ! command -v python3 >/dev/null 2>&1; then
            log_error "Python 3 not found. Please install Python 3."
            exit 1
        fi
        
        # Start service
        start_service
        
        echo ""
        log_success "Python Inventory Service is ready!"
        echo "  🌐 API available at: http://localhost:$PORT"
        echo "  📖 API docs at: http://localhost:$PORT/docs"
        echo "  📋 View logs with: $0 logs"
        echo "  ⏹️  Stop with: $0 stop"
        ;;
        
    "stop")
        log_info "Stopping Python Inventory Service"
        stop_service
        ;;
        
    "restart")
        log_info "Restarting Python Inventory Service"
        stop_service
        sleep 2
        start_service
        ;;
        
    "status")
        show_status
        ;;
        
    "logs")
        show_logs
        ;;
        
    "setup")
        log_info "Setting up Python environment only"
        cd "$SERVICE_DIR"
        setup_venv
        log_success "Python environment setup complete"
        ;;
        
    "help"|"--help"|"-h")
        echo "Python Inventory Service Runner"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start the service (default)"
        echo "  stop      Stop the service"
        echo "  restart   Restart the service"
        echo "  status    Show service status"
        echo "  logs      Show recent service logs"
        echo "  setup     Setup Python environment only"
        echo "  help      Show this help message"
        echo ""
        echo "The service will be available at: http://localhost:$PORT"
        echo "API documentation at: http://localhost:$PORT/docs"
        ;;
        
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac