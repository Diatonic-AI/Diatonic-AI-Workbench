#!/bin/bash

# DynamoDB Local Management Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log() {
    echo -e "${GREEN}[DynamoDB Local]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[DynamoDB Local]${NC} $1"
}

error() {
    echo -e "${RED}[DynamoDB Local]${NC} $1"
}

info() {
    echo -e "${BLUE}[DynamoDB Local]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Function to start DynamoDB Local
start_dynamodb() {
    log "Starting DynamoDB Local..."
    cd "$PROJECT_DIR"
    
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d dynamodb-local dynamodb-admin
    else
        docker compose up -d dynamodb-local dynamodb-admin
    fi
    
    # Wait for DynamoDB to be ready
    log "Waiting for DynamoDB Local to be ready..."
    sleep 5
    
    # Check if DynamoDB is responding
    if curl -s http://localhost:8002 > /dev/null 2>&1; then
        log "✅ DynamoDB Local is running on http://localhost:8002"
        log "✅ DynamoDB Admin UI is available at http://localhost:8001"
    else
        error "❌ DynamoDB Local failed to start"
        exit 1
    fi
}

# Function to stop DynamoDB Local
stop_dynamodb() {
    log "Stopping DynamoDB Local..."
    cd "$PROJECT_DIR"
    
    if command -v docker-compose &> /dev/null; then
        docker-compose down
    else
        docker compose down
    fi
    
    log "✅ DynamoDB Local stopped"
}

# Function to check DynamoDB status
status_dynamodb() {
    log "Checking DynamoDB Local status..."
    
    if curl -s http://localhost:8002 > /dev/null 2>&1; then
        log "✅ DynamoDB Local is running on http://localhost:8002"
        log "✅ Admin UI: http://localhost:8001"
        
        # List tables
        aws dynamodb list-tables --endpoint-url http://localhost:8002 --region us-east-2 2>/dev/null || {
            warn "AWS CLI not configured or available"
            info "You can still use the Admin UI at http://localhost:8001"
        }
    else
        warn "❌ DynamoDB Local is not running"
        info "Run '$0 start' to start it"
    fi
}

# Function to reset DynamoDB Local data
reset_dynamodb() {
    warn "This will delete all local DynamoDB data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Stopping DynamoDB Local..."
        stop_dynamodb
        
        log "Removing local data..."
        rm -rf "$PROJECT_DIR/.dynamodb-local"
        mkdir -p "$PROJECT_DIR/.dynamodb-local"
        
        log "Starting DynamoDB Local..."
        start_dynamodb
        
        log "✅ DynamoDB Local has been reset"
    else
        log "Reset cancelled"
    fi
}

# Function to setup tables and seed data
setup_tables() {
    log "Setting up DynamoDB tables and seeding data..."
    
    # Check if DynamoDB is running
    if ! curl -s http://localhost:8002 > /dev/null 2>&1; then
        log "DynamoDB Local is not running. Starting it..."
        start_dynamodb
    fi
    
    # Run the setup script
    cd "$PROJECT_DIR"
    node scripts/setup-comprehensive-content.cjs
}

# Function to open admin UI
open_admin() {
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:8001
    elif command -v open &> /dev/null; then
        open http://localhost:8001
    else
        info "Admin UI is available at: http://localhost:8001"
    fi
}

# Function to show logs
logs_dynamodb() {
    cd "$PROJECT_DIR"
    if command -v docker-compose &> /dev/null; then
        docker-compose logs -f dynamodb-local
    else
        docker compose logs -f dynamodb-local
    fi
}

# Main script logic
case "$1" in
    "start")
        check_docker
        start_dynamodb
        ;;
    "stop")
        check_docker
        stop_dynamodb
        ;;
    "status")
        status_dynamodb
        ;;
    "reset")
        check_docker
        reset_dynamodb
        ;;
    "setup")
        check_docker
        setup_tables
        ;;
    "admin")
        open_admin
        ;;
    "logs")
        check_docker
        logs_dynamodb
        ;;
    "restart")
        check_docker
        stop_dynamodb
        sleep 2
        start_dynamodb
        ;;
    *)
        echo "DynamoDB Local Management Script"
        echo ""
        echo "Usage: $0 {start|stop|status|reset|setup|admin|logs|restart}"
        echo ""
        echo "Commands:"
        echo "  start   - Start DynamoDB Local and Admin UI"
        echo "  stop    - Stop DynamoDB Local"
        echo "  status  - Check if DynamoDB Local is running"
        echo "  reset   - Reset local data (WARNING: deletes all data)"
        echo "  setup   - Create tables and seed with sample data"
        echo "  admin   - Open Admin UI in browser"
        echo "  logs    - Show DynamoDB Local logs"
        echo "  restart - Restart DynamoDB Local"
        echo ""
        echo "URLs:"
        echo "  DynamoDB Local: http://localhost:8002"
        echo "  Admin UI:       http://localhost:8001"
        exit 1
        ;;
esac
