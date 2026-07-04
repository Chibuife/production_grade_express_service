# Production Grade Express Service

A simple Express.js service with logging, middleware, and user routes.

## Features
- Express server with JSON parsing
- Morgan request logging
- Custom auth middleware for bearer-token protection
- User routes

## Getting Started

### Install dependencies
```bash
npm install
```

### Run in development mode
```bash
npm run dev
```

### Build the project
```bash
npm run build
```

### Start the built app
```bash
npm start
```

## Environment Variables
Create a .env file in the project root with the following values:

```bash
PORT=5000
NODE_ENV=development
JWT_SECRET=your-jwt-secret
MONGO_URI=mongodb://localhost:27017/production-grade-expree-service
AUTH_TOKEN=your-secret-token
```

## Auth endpoints
- POST /auth/register -> create a user and return a JWT
- POST /auth/login -> sign in a user and return a JWT
- POST /auth/logout -> clear the client-side session state

## API Notes
- Base URL: `http://localhost:5000`
- Protected routes under `/users` require a `Bearer` token in the `Authorization` header
# production_grade_express_service
