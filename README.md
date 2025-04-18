# Time Tracking App

A full-stack application for tracking time and managing tasks with Google Calendar integration.

## Project Structure

```
timetracking/
├── backend/             # Backend Node.js application
│   ├── src/            # Source code
│   ├── Dockerfile      # Backend Docker configuration
│   └── package.json    # Backend dependencies
├── frontend/           # React frontend application
│   ├── src/           # Source code
│   ├── Dockerfile     # Frontend Docker configuration
│   └── package.json   # Frontend dependencies
└── docker-compose.yml # Docker compose configuration
```

## Development

### Prerequisites

- Docker and Docker Compose
- Node.js 18+

### Environment Setup
1. Copy `.env.example` to `.env` and fill in the required values
2. Make sure you have the correct Google OAuth credentials set up for both development and production

### Running the Application

We provide a convenient shell script `run.sh` to manage different environments:

```bash
# Start development environment (default)
./run.sh up

# Start production environment
./run.sh up prod

# View logs (development)
./run.sh logs

# View production logs
./run.sh logs prod

# Stop development environment
./run.sh down

# Restart development environment
./run.sh restart
```

Available commands:
- `up`: Start the containers
- `down`: Stop the containers
- `restart`: Restart the containers
- `logs`: Show container logs

Available environments:
- `dev`: Development environment (default)
  - Hot-reloading enabled
  - Source code mounted into containers
  - Development OAuth credentials
  - Local MongoDB access
- `prod`: Production environment
  - Optimized builds
  - Production OAuth credentials
  - Secured MongoDB

### Development Features
- Frontend runs on `http://localhost:3001`
- Backend API on `http://localhost:3000`
- MongoDB on port `27017` (development only)
- Hot-reloading for both frontend and backend
- TypeScript compilation on the fly

## Features

- Google Calendar Integration
- Project Tag Filtering
- Time Duration Tracking
- MongoDB Storage

## API Endpoints

- `GET /api/events`: Get calendar events
- `GET /api/events/tags`: Get all project tags
- `GET /auth/google`: Initiate Google OAuth flow
- `GET /auth/google/callback`: Google OAuth callback

## Docker Services

- **backend**: Node.js API server
- **frontend**: React frontend application
- **mongodb**: MongoDB database

## License

MIT 