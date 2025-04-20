#!/bin/bash

# Function to display usage
show_usage() {
    echo "Usage: ./run.sh [command] [environment]"
    echo ""
    echo "Commands:"
    echo "  up        Start the containers"
    echo "  down      Stop the containers"
    echo "  restart   Restart the containers"
    echo "  logs      Show container logs"
    echo ""
    echo "Environments:"
    echo "  dev       Development environment (default)"
    echo "  prod      Production environment"
    echo ""
    echo "Examples:"
    echo "  ./run.sh up dev     # Start development environment"
    echo "  ./run.sh down prod  # Stop production environment"
    echo "  ./run.sh logs       # Show development logs"
}

# Default values
COMMAND=${1:-"up"}
ENV=${2:-"dev"}
COMPOSE_FILE="docker-compose.$ENV.yml"

# Validate environment
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Error: Invalid environment. Use 'dev' or 'prod'"
    show_usage
    exit 1
fi

# Copy production compose file if in prod mode
if [[ "$ENV" == "prod" ]]; then
    echo "Copying production compose file..."
    cp docker-compose.prod.yml docker-compose.yml
fi

# Execute command
case "$COMMAND" in
    "up")
        echo "Starting $ENV environment..."
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up --build -d
        echo "Containers are starting. Use './run.sh logs $ENV' to view logs"
        ;;
    "down")
        echo "Stopping $ENV environment..."
        docker-compose -f $COMPOSE_FILE down
        ;;
    "restart")
        echo "Restarting $ENV environment..."
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up --build -d
        ;;
    "logs")
        echo "Showing logs for $ENV environment..."
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    *)
        echo "Error: Invalid command"
        show_usage
        exit 1
        ;;
esac 