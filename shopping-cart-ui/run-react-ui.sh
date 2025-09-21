#!/bin/bash

# React UI Service Runner
# This script manages the React frontend application

set -e  # Exit on any error

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$PROJECT_DIR/react-ui.log"
PID_FILE="$PROJECT_DIR/react-ui.pid"
PORT=3000

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

# Stop the service
stop_service() {
    log_info "Stopping React UI..."

    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            sleep 2
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi

    # Also kill by port
    local pids=$(lsof -t -i :$PORT 2>/dev/null || true)
    if [ -n "$pids" ]; then
        kill $pids 2>/dev/null || true
    fi

    log_success "React UI stopped"
}

# Start the service
start_service() {
    log_info "Starting React UI..."

    # Change to project directory
    cd "$PROJECT_DIR"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        pnpm install
    fi

    # Clear previous log
    > "$LOG_FILE"

    # Start the development server
    pnpm dev --port $PORT --host 0.0.0.0 > "$LOG_FILE" 2>&1 &
    local service_pid=$!

    # Save PID
    echo $service_pid > "$PID_FILE"

    log_info "React UI started with PID: $service_pid"
    log_info "Waiting for service to initialize..."

    # Wait for service to start (max 30 seconds)
    local timeout=30
    local count=0

    while [ $count -lt $timeout ]; do
        if lsof -i :$PORT >/dev/null 2>&1; then
            log_success "React UI is running on http://localhost:$PORT"
            return 0
        fi

        # Check if process died
        if ! kill -0 $service_pid 2>/dev/null; then
            log_error "React UI process died during startup"
            log_error "Check logs for details: tail $LOG_FILE"
            return 1
        fi

        sleep 1
        count=$((count + 1))
        echo -n "."
    done

    echo ""
    log_error "React UI failed to start within $timeout seconds"
    log_error "Check logs for details: tail $LOG_FILE"
    return 1
}

# Show status
show_status() {
    if check_running; then
        local pid=$(cat "$PID_FILE")
        log_success "React UI is running"
        echo "  PID: $pid"
        echo "  URL: http://localhost:$PORT"
        echo "  Log: $LOG_FILE"
    else
        log_warning "React UI is not running"
    fi
}

# Show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "--- Last 20 lines of React UI log ---"
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
        log_info "Starting React UI Service"

        # Check if already running
        if check_running; then
            log_warning "React UI is already running on port $PORT"
            show_status
            exit 0
        fi

        # Verify Node.js and pnpm are available
        if ! command -v node >/dev/null 2>&1; then
            log_error "Node.js not found. Please install Node.js."
            exit 1
        fi

        if ! command -v pnpm >/dev/null 2>&1; then
            log_error "pnpm not found. Please install pnpm (npm install -g pnpm)."
            exit 1
        fi

        # Start service
        start_service

        echo ""
        log_success "React UI is ready!"
        echo "  🌐 Open your browser to: http://localhost:$PORT"
        echo "  📋 View logs with: $0 logs"
        echo "  ⏹️  Stop with: $0 stop"
        ;;

    "stop")
        log_info "Stopping React UI Service"
        stop_service
        ;;

    "restart")
        log_info "Restarting React UI Service"
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

    "help"|"--help"|"-h")
        echo "React UI Service Runner"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start the React UI (default)"
        echo "  stop      Stop the React UI"
        echo "  restart   Restart the React UI"
        echo "  status    Show service status"
        echo "  logs      Show recent service logs"
        echo "  help      Show this help message"
        echo ""
        echo "The React UI will be available at: http://localhost:$PORT"
        ;;

    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac