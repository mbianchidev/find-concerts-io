# GitHub Copilot Instructions - Find Concerts IO

## Project Overview
This is a music event search application that helps users discover concerts, festivals, and live music events. The app integrates with multiple music APIs and provides features like artist following, event recommendations, and venue information.

## Technology Stack

### Frontend:
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode enabled)
- **Styling:** Tailwind CSS with custom design system
- **State Management:** React Query (TanStack Query) for server state, Zustand for client state
- **UI Components:** shadcn/ui or custom components
- **Authentication:** NextAuth.js
- **Maps:** Google Maps API integration
- **PWA:** Next.js PWA plugin for offline functionality

### Backend:
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js or Fastify
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT tokens with NextAuth.js
- **Caching:** Redis for session and API response caching
- **File Upload:** Cloudinary for image management
- **Background Jobs:** Bull Queue with Redis

### External APIs:
- Bandsintown API (Primary event data source)
- Spotify API (Artist information and music samples)
- Ticketmaster API (Additional event and venue data)
- Google Maps API (Geolocation and venue mapping)
- Last.fm API (Artist metadata and similar artists)

## Code Style Guidelines

### TypeScript:
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper generic constraints
- Always type API responses and database models
- Use branded types for IDs
- Avoid `any` type; use unknown where necessary

### React/Next.js:
- Use functional components with hooks
- Prefer Server Components when possible
- Use proper error boundaries
- Implement proper loading states
- Use React.memo() for expensive renders
- Follow the Next.js App Router patterns

### API Design:
- Use RESTful endpoints where appropriate
- Implement proper HTTP status codes
- Use consistent response formats
- Include pagination for list endpoints
- Implement rate limiting
- Use proper error handling middleware

### Database:
- Use Prisma schema-first approach
- Implement proper database indexes
- Use transactions for multi-table operations
- Follow PostgreSQL naming conventions (snake_case)
- Implement soft deletes where appropriate

## Key Patterns to Follow

React Query Usage:

```typescript
const useEvents = (searchParams: SearchParams) => {
  return useQuery({
    queryKey: ['events', searchParams],
    queryFn: () => api.events.search(searchParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

Component Patterns:

```typescript
interface EventCardProps {
  event: Event;
  onFavorite?: (eventId: string) => void;
  className?: string;
}

export function EventCard({ event, onFavorite, className }: EventCardProps) {
  // Implementation
}
```

API service Classes:

```typescript
class BandsinTownService {
  private readonly baseUrl = 'https://rest.bandsintown.com';
  
  async searchEvents(params: SearchParams): Promise<Event[]> {
    // Implementation with proper error handling and caching
  }
}
```

# Important Guidelines for Copilot:
- Follow established patterns and conventions
- Include proper TypeScript types
- Implement error handling
- Consider performance implications
- Add appropriate comments for complex logic
- Use the project's established component and utility patterns
- Follow security guidelines
- Consider accessibility (a11y) in UI components
- Use semantic HTML elements
- Implement proper loading and error states

# Project Context:
Consumer-facing application focused on music discovery, UX, performance and user experience are critical, mobile-first responsive design, International users consideration (timezones, currencies, languages), Analytics tracking for user behavior, GDPR and privacy compliance

# Important
DO NOT ALLUCINATE, keep the changes scoped to the request, always test that the code works as expected, and ensure that the code adheres to the project's coding standards and guidelines.