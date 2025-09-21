#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Service ports
OTEL_PORT=4318
ORLEANS_PORT=5001
PYTHON_PORT=8000
REACT_PORT=3000

# Function to check if a service is running
check_service() {
    local port=$1
    local name=$2
    if curl -s "http://localhost:${port}/health" > /dev/null; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running"
        return 1
    fi
}

# Function to test OpenTelemetry endpoint
test_otel() {
    echo -e "\n${CYAN}Testing OpenTelemetry Collector...${NC}"
    if curl -s "http://localhost:${OTEL_PORT}/health" > /dev/null; then
        echo -e "${GREEN}✓${NC} OpenTelemetry Collector is healthy"
        
        # Test trace export
        echo -e "\nSending test trace..."
        curl -X POST "http://localhost:${OTEL_PORT}/v1/traces" \
            -H "Content-Type: application/json" \
            -d '{
                "resourceSpans": [{
                    "resource": {
                        "attributes": [{
                            "key": "service.name",
                            "value": { "stringValue": "test-service" }
                        }]
                    },
                    "scopeSpans": [{
                        "spans": [{
                            "name": "test-span",
                            "kind": 1,
                            "traceId": "01020304050607080102030405060708",
                            "spanId": "0102030405060708",
                            "startTimeUnixNano": "1544712660300000000",
                            "endTimeUnixNano": "1544712661300000000"
                        }]
                    }]
                }]
            }'
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Test trace sent successfully"
        else
            echo -e "${RED}✗${NC} Failed to send test trace"
        fi
    else
        echo -e "${RED}✗${NC} OpenTelemetry Collector is not healthy"
    fi
}

# Function to test Python service telemetry
test_python() {
    echo -e "\n${CYAN}Testing Python Inventory Service...${NC}"
    if curl -s "http://localhost:${PYTHON_PORT}/health" > /dev/null; then
        echo -e "${GREEN}✓${NC} Python service is healthy"
        
        # Test product listing with telemetry
        echo -e "\nTesting product listing..."
        curl -s "http://localhost:${PYTHON_PORT}/products" > /dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Product listing request completed"
        else
            echo -e "${RED}✗${NC} Product listing request failed"
        fi
    else
        echo -e "${RED}✗${NC} Python service is not healthy"
    fi
}

# Function to test Orleans service telemetry
test_orleans() {
    echo -e "\n${CYAN}Testing Orleans Service...${NC}"
    if curl -s "http://localhost:${ORLEANS_PORT}/health" > /dev/null; then
        echo -e "${GREEN}✓${NC} Orleans service is healthy"
        
        # Test API endpoint with telemetry
        echo -e "\nTesting API endpoint..."
        curl -s "http://localhost:${ORLEANS_PORT}/api/test/compare" > /dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} API request completed"
        else
            echo -e "${RED}✗${NC} API request failed"
        fi
    else
        echo -e "${RED}✗${NC} Orleans service is not healthy"
    fi
}

# Function to test React UI telemetry
test_react() {
    echo -e "\n${CYAN}Testing React UI...${NC}"
    if curl -s "http://localhost:${REACT_PORT}" > /dev/null; then
        echo -e "${GREEN}✓${NC} React UI is accessible"
        echo -e "${YELLOW}ℹ${NC} Manual testing required: Open browser console to verify telemetry initialization"
    else
        echo -e "${RED}✗${NC} React UI is not accessible"
    fi
}

# Main test sequence
echo -e "${CYAN}Starting Telemetry Tests${NC}"
echo "================================"

# Check if services are running
check_service $OTEL_PORT "OpenTelemetry Collector" && test_otel
check_service $PYTHON_PORT "Python Service" && test_python
check_service $ORLEANS_PORT "Orleans Service" && test_orleans
check_service $REACT_PORT "React UI" && test_react

echo -e "\n${CYAN}Test Summary${NC}"
echo "================================"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check Honeycomb UI for traces"
echo "2. Verify distributed tracing between services"
echo "3. Check custom metrics in Honeycomb"
echo "4. Verify error tracking and logging"
