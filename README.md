# Time Tracking App

A time tracking application that integrates with Google Calendar.

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

- Node.js (v18 or later)
- npm
- Docker and Docker Compose (for containerized deployment)
- MongoDB

### Environment Variables

Copy the example environment file and update it with your settings:

```bash
cp .env.example .env
```

Update the `.env` file with your Google OAuth credentials and other configuration. The environment variables are used by both the Docker setup and local development.

### Installation

1. Install dependencies for both backend and frontend:

```bash
npm run install:all
```

### Running the Application

#### Development Mode

To run both backend and frontend in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:backend
npm run dev:frontend
```

#### Using Docker

To run the entire application using Docker:

```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- MongoDB: localhost:27017

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