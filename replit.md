# German B1 Trainer - Replit.md

## Overview

This is a German B1 vocabulary learning application built with a modern full-stack architecture. The app helps users learn German vocabulary through spaced repetition, interactive exercises, and AI-powered content generation. It features a React frontend with TypeScript, an Express.js backend, and uses Drizzle ORM with PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **Middleware**: Custom logging, error handling, and request parsing
- **File Uploads**: Multer for CSV file processing
- **AI Integration**: OpenAI API for vocabulary generation and memory tips

### Database Architecture
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon Database)
- **Migration System**: Drizzle Kit for schema migrations
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Key Components

### Core Data Models
1. **Vocabulary Words**: German words with articles, English translations, categories, and example sentences
2. **User Progress**: Spaced repetition tracking with ease factors and review intervals
3. **Learning Sessions**: Session management for learning and review activities
4. **User Settings**: Configurable preferences for learning experience

### Frontend Components
- **Sidebar Navigation**: Fixed sidebar with responsive mobile behavior
- **Dashboard**: Overview with statistics and recent activity
- **Learning Modes**: Separate pages for learning new words and reviewing
- **Vocabulary Management**: CRUD operations with search and filtering
- **Verb Practice**: Interactive German verb conjugation exercises
- **Grammar Teaching**: AI-powered grammar concept validation system
- **Progress Tracking**: Visual progress charts and statistics
- **Audio Integration**: Pronunciation features throughout the app
- **Settings**: User preference configuration with audio controls

### Backend Services
- **Storage Layer**: Abstracted storage interface with in-memory implementation
- **OpenAI Service**: AI-powered vocabulary generation, memory tips, and grammar validation
- **File Processing**: CSV import functionality for bulk vocabulary addition
- **Spaced Repetition**: Algorithm implementation for optimal review scheduling
- **Audio Services**: Web Speech API integration for German pronunciation
- **Grammar Validation**: AI-powered assessment of user grammar explanations

## Data Flow

### Learning Session Flow
1. User initiates learning or review session
2. Backend selects appropriate words based on spaced repetition algorithm
3. Frontend presents interactive exercises (article selection, translation)
4. User responses are tracked and sent to backend
5. Progress is updated using spaced repetition calculations
6. Session completion triggers statistics updates

### Vocabulary Management Flow
1. Manual word addition through forms with validation
2. AI-generated vocabulary from topic prompts
3. CSV bulk import with error handling
4. Real-time search and filtering on frontend
5. Progress tracking integration for all vocabulary sources

### Progress Tracking Flow
1. All user interactions generate progress events
2. Spaced repetition algorithm calculates next review dates
3. Dashboard aggregates statistics from multiple data sources
4. Visual charts display category-wise and overall progress

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4o model for vocabulary generation and memory tips
- **Integration**: Environment variable configuration for API key
- **Fallback**: Error handling for API failures

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Connection**: Environment variable for DATABASE_URL
- **Backup Strategy**: Relies on Neon's built-in backup systems

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library for consistent iconography
- **React Query**: Server state management and caching
- **Tailwind CSS**: Utility-first styling framework

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement for frontend development
- **Express Server**: Direct TypeScript execution with tsx
- **Database**: Local or remote PostgreSQL connection
- **Environment**: NODE_ENV=development with debug logging

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Deployment**: Single-process deployment serving both API and static files
- **Environment**: NODE_ENV=production with minimal logging

### Configuration Management
- **Environment Variables**: DATABASE_URL, OPENAI_API_KEY
- **Build Scripts**: Separate dev, build, and start commands
- **Asset Serving**: Express serves Vite-built static files in production
- **Database Migrations**: Manual execution via `npm run db:push`

### Scalability Considerations
- **Storage Interface**: Abstract layer allows switching from in-memory to database storage
- **Stateless Design**: No server-side sessions, all state in database
- **Caching Strategy**: TanStack Query provides client-side caching
- **Database Optimization**: Indexed queries for vocabulary and progress lookups