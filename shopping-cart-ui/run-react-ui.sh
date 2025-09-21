#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check if a port is in use
is_port_in_use() {
    lsof -i :"$1" > /dev/null 2>&1
    return $?
}

# Function to get PID from file
get_pid() {
    if [ -f "$1" ]; then
        cat "$1"
    else
        echo ""
    fi
}

# Function to check if a process is running
is_process_running() {
    local pid=$1
    if [ -n "$pid" ]; then
        kill -0 "$pid" 2>/dev/null
        return $?
    fi
    return 1
}

# Function to write PID to file
write_pid() {
    echo "$1" > "$2"
}

# PID file location
PID_FILE="$SCRIPT_DIR/react-ui.pid"

case "$1" in
    start)
        echo "[INFO] Starting React UI..."
        
        # Check if already running
        PID=$(get_pid "$PID_FILE")
        if is_process_running "$PID"; then
            echo "[INFO] React UI is already running with PID: $PID"
            exit 0
        fi

        # Check if port is in use
        if is_port_in_use 3000; then
            echo "[ERROR] Port 3000 is already in use"
            exit 1
        fi

        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            echo "[INFO] Installing dependencies..."
            npm install
        fi

        # Start the development server
        npm run dev > react-ui.log 2>&1 &
        PID=$!
        write_pid "$PID" "$PID_FILE"
        
        echo "[INFO] React UI started with PID: $PID"
        echo "[INFO] Waiting for service to initialize..."
        
        # Wait for the service to start
        ATTEMPTS=0
        MAX_ATTEMPTS=30
        while ! is_port_in_use 3000; do
            sleep 1
            ATTEMPTS=$((ATTEMPTS + 1))
            if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
                echo "[ERROR] React UI failed to start"
                exit 1
            fi
            echo -n "."
        done
        echo ""
        
        echo "[SUCCESS] React UI is running on http://localhost:3000"
        ;;
        
    stop)
        PID=$(get_pid "$PID_FILE")
        if [ -n "$PID" ]; then
            echo "[INFO] Stopping React UI (PID: $PID)..."
            kill "$PID" 2>/dev/null
            rm -f "$PID_FILE"
            echo "[SUCCESS] React UI stopped"
        else
            echo "[INFO] React UI is not running"
        fi
        ;;
        
    status)
        PID=$(get_pid "$PID_FILE")
        if is_process_running "$PID"; then
            echo "[INFO] React UI is running with PID: $PID"
            exit 0
        else
            echo "[INFO] React UI is not running"
            exit 1
        fi
        ;;
        
    logs)
        if [ -f "react-ui.log" ]; then
            tail -f react-ui.log
        else
            echo "[ERROR] Log file not found"
            exit 1
        fi
        ;;
        
    *)
        echo "Usage: $0 {start|stop|status|logs}"
        exit 1
        ;;
esac

exit 0
