#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check if Docker is running
check_docker() {
    docker info >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "[ERROR] Docker is not running"
        exit 1
    fi
}

# Function to check if a container is running
is_container_running() {
    docker ps --filter "name=$1" --format '{{.Names}}' | grep -q "^$1\$"
    return $?
}

case "$1" in
    start)
        check_docker

        if is_container_running "otel-collector"; then
            echo "[INFO] OpenTelemetry Collector is already running"
            exit 0
        fi

        echo "[INFO] Starting OpenTelemetry Collector..."
        docker-compose up -d otel-collector

        # Wait for collector to start
        count=0
        max_attempts=30
        while ! curl -s http://localhost:4318/health > /dev/null; do
            sleep 1
            count=$((count + 1))
            if [ $count -ge $max_attempts ]; then
                echo "[ERROR] OpenTelemetry Collector failed to start"
                exit 1
            fi
            echo -n "."
        done
        echo ""
        echo "[SUCCESS] OpenTelemetry Collector is running"
        ;;

    stop)
        check_docker
        echo "[INFO] Stopping OpenTelemetry Collector..."
        docker-compose down
        echo "[SUCCESS] OpenTelemetry Collector stopped"
        ;;

    status)
        check_docker
        if is_container_running "otel-collector"; then
            echo "[INFO] OpenTelemetry Collector is running"
            docker-compose ps
            exit 0
        else
            echo "[INFO] OpenTelemetry Collector is not running"
            exit 1
        fi
        ;;

    logs)
        check_docker
        docker-compose logs -f otel-collector
        ;;

    *)
        echo "Usage: $0 {start|stop|status|logs}"
        exit 1
        ;;
esac

exit 0
