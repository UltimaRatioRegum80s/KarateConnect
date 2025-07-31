# NKF EXCO Portal - Replit Project Documentation

## Overview

This is a comprehensive governance portal built for the Namibia Karate Federation (NKF) Executive Committee. It's a full-featured platform that allows EXCO members to communicate in topic-based chat rooms, participate in WhatsApp-style polling, manage financial oversight with interactive visualizations, and handle secure bank statement analysis. The application uses a modern tech stack with React on the frontend, Express.js on the backend, PostgreSQL for data storage, and WebSocket connections for real-time messaging.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with clear separation between client, server, and shared code:

- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: WebSocket for live messaging
- **Authentication**: Replit Auth integration
- **UI Framework**: Shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state

## Key Components

### Frontend Architecture (`client/`)
- **React Router**: Uses Wouter for client-side routing
- **UI Components**: Built with Radix UI primitives and Shadcn/ui styling
- **State Management**: TanStack Query handles server state and caching
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Real-time**: WebSocket client for live chat functionality

### Backend Architecture (`server/`)
- **Express Server**: RESTful API with middleware for logging and error handling
- **Authentication**: Replit Auth with session management using PostgreSQL
- **Database**: Drizzle ORM with type-safe database operations
- **WebSocket Server**: Real-time messaging capabilities
- **Storage Layer**: Abstracted storage interface for database operations

### Shared Code (`shared/`)
- **Database Schema**: Drizzle schema definitions shared between client and server
- **Type Definitions**: TypeScript types for consistent data structures

## Data Flow

1. **Authentication**: Users authenticate through Replit Auth, creating sessions stored in PostgreSQL
2. **Chat Rooms**: Users can view available chat rooms and join them
3. **Real-time Messaging**: Messages are sent via WebSocket and stored in the database
4. **Data Fetching**: Frontend uses TanStack Query to fetch and cache data from REST endpoints
5. **State Updates**: Real-time updates are handled through WebSocket connections

## External Dependencies

### Core Technologies
- **Database**: Neon PostgreSQL (serverless)
- **Authentication**: Replit Auth with OpenID Connect
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS
- **Build Tools**: Vite for frontend, esbuild for backend

### Key Libraries
- **Drizzle ORM**: Type-safe database operations
- **TanStack Query**: Server state management
- **Wouter**: Lightweight React router
- **Express**: Node.js web framework
- **WebSocket**: Real-time communication

## Deployment Strategy

The application is designed for deployment on Replit with the following setup:

- **Development**: `npm run dev` starts the Express server with Vite middleware
- **Production Build**: `npm run build` creates optimized client bundle and server build
- **Production Start**: `npm start` runs the production server
- **Database**: Uses Neon PostgreSQL with connection pooling
- **Environment**: Requires `DATABASE_URL` and `SESSION_SECRET` environment variables

### Key Features
- **Multi-Channel Communication**: Topic-based chat rooms with multimedia support and file sharing
- **WhatsApp-Style Polling**: Interactive voting system for organizational decisions
- **Financial Management**: Interactive charts showing income/expense trends, budget tracking, and projections
- **Bank Statement Analysis**: Admin-only secure upload and analysis system with automatic categorization
- **Real-time Messaging**: WebSocket connections for instant communication
- **Role-Based Access**: Admin controls for sensitive financial data
- **Session Management**: PostgreSQL-backed sessions with configurable TTL
- **Mobile Responsive**: Tailwind CSS ensures mobile compatibility
- **Type Safety**: Full TypeScript coverage across the stack

### Recent Updates (January 2025)
- ✅ Added comprehensive financial visualization with 4 chart types (line, bar, pie charts)
- ✅ Implemented admin-only bank statement upload and analysis system
- ✅ Created interactive polling system with real-time vote tracking
- ✅ Enhanced chat rooms with multimedia capabilities
- ✅ Built financial database with sample data for testing
- ✅ Ready for deployment at custom subdomain (exco-portal.replit.app requested)

The architecture prioritizes governance functionality, financial transparency, and secure communication while maintaining real-time collaboration capabilities for executive decision-making.