# Time Tracking Application

A Node.js application that reads events from Google Calendar and generates timesheets based on project tags.

## Features

- Read events from Google Calendar
- Filter events by project tags (e.g., "#myProject")
- Store events in MongoDB
- Generate timesheets in multiple formats (coming soon)
- Track time spent on different tasks

## Prerequisites

- Docker and Docker Compose
- Google Cloud Platform account with Calendar API enabled

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
MONGODB_URI=mongodb://mongodb:27017/timetracking
```

## Setup with Docker

1. Set up Google Cloud Project:
   - Create a new project in Google Cloud Console
   - Enable the Google Calendar API
   - Create OAuth 2.0 credentials
   - Add the credentials to your `.env` file

2. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000

## Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

## API Endpoints

- `GET /auth/google` - Start Google OAuth flow
- `GET /auth/google/callback` - Google OAuth callback
- `GET /api/events` - Get calendar events

## Docker Services

- **backend**: Node.js API server
- **frontend**: React frontend application
- **mongodb**: MongoDB database

## License

MIT 