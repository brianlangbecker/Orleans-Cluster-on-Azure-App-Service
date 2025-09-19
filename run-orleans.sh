#!/bin/bash

# Orleans Shopping Cart Application Runner
# This script ensures the application runs correctly every time

set -e  # Exit on any error

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SILO_DIR="$PROJECT_DIR/Silo"
LOG_FILE="$SILO_DIR/orleans-app.log"
PORT=5001
PROCESS_NAME="Orleans.ShoppingCart.Silo"

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

# Check if application is already running
check_running() {
    if lsof -i :$PORT >/dev/null 2>&1; then
        local pid=$(lsof -t -i :$PORT)
        local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        return 0  # Running
    else
        return 1  # Not running
    fi
}

# Stop existing application
stop_application() {
    log_info "Stopping existing Orleans application..."

    # Kill by port
    local pids=$(lsof -t -i :$PORT 2>/dev/null || true)
    if [ -n "$pids" ]; then
        kill $pids 2>/dev/null || true
        sleep 2
    fi

    # Kill by process name (backup)
    pkill -f "dotnet run" 2>/dev/null || true
    pkill -f "$PROCESS_NAME" 2>/dev/null || true

    # Wait for processes to stop
    sleep 3

    if check_running; then
        log_warning "Force killing processes on port $PORT..."
        local pids=$(lsof -t -i :$PORT 2>/dev/null || true)
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null || true
        fi
        sleep 2
    fi

    log_success "Application stopped"
}

# Start the application
start_application() {
    log_info "Starting Orleans Shopping Cart application..."

    # Change to silo directory
    cd "$SILO_DIR"

    # Clear previous log
    > "$LOG_FILE"

    # Start application in background
    ASPNETCORE_ENVIRONMENT=Development nohup dotnet run --urls "http://localhost:$PORT" > "$LOG_FILE" 2>&1 &
    local app_pid=$!

    log_info "Application started with PID: $app_pid"
    log_info "Waiting for application to initialize..."

    # Wait for application to start (max 30 seconds)
    local timeout=30
    local count=0

    while [ $count -lt $timeout ]; do
        if check_running; then
            if grep -q "Now listening on" "$LOG_FILE" 2>/dev/null; then
                log_success "Application is running on http://localhost:$PORT"
                return 0
            fi
        fi

        # Check if process died
        if ! kill -0 $app_pid 2>/dev/null; then
            log_error "Application process died during startup"
            log_error "Check logs for details: tail $LOG_FILE"
            return 1
        fi

        sleep 1
        count=$((count + 1))
        echo -n "."
    done

    echo ""
    log_error "Application failed to start within $timeout seconds"
    log_error "Check logs for details: tail $LOG_FILE"
    return 1
}

# Show status
show_status() {
    if check_running; then
        local pid=$(lsof -t -i :$PORT)
        log_success "Orleans application is running"
        echo "  PID: $pid"
        echo "  URL: http://localhost:$PORT"
        echo "  Log: $LOG_FILE"
    else
        log_warning "Orleans application is not running"
    fi
}

# Show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "--- Last 20 lines of application log ---"
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
        log_info "Starting Orleans Shopping Cart Application"

        # Check if already running
        if check_running; then
            log_warning "Application is already running on port $PORT"
            show_status
            exit 0
        fi

        # Verify .NET is available
        if ! command -v dotnet >/dev/null 2>&1; then
            log_error ".NET SDK not found. Please install .NET 9 SDK."
            exit 1
        fi

        # Verify project directory exists
        if [ ! -d "$PROJECT_DIR" ]; then
            log_error "Project directory not found: $PROJECT_DIR"
            exit 1
        fi

        # Start application
        start_application

        echo ""
        log_success "Orleans Shopping Cart is ready!"
        echo "  🌐 Open your browser to: http://localhost:$PORT"
        echo "  📋 View logs with: $0 logs"
        echo "  ⏹️  Stop with: $0 stop"
        ;;

    "stop")
        log_info "Stopping Orleans Shopping Cart Application"
        stop_application
        ;;

    "restart")
        log_info "Restarting Orleans Shopping Cart Application"
        stop_application
        sleep 2
        start_application
        ;;

    "status")
        show_status
        ;;

    "logs")
        show_logs
        ;;

    "help"|"--help"|"-h")
        echo "Orleans Shopping Cart Application Runner"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start the application (default)"
        echo "  stop      Stop the application"
        echo "  restart   Restart the application"
        echo "  status    Show application status"
        echo "  logs      Show recent application logs"
        echo "  help      Show this help message"
        echo ""
        echo "The application will be available at: http://localhost:$PORT"
        ;;

    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
