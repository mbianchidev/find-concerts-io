# Find Concerts IO

A modern, responsive web application for discovering music events worldwide. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Search & Filters**: Find events by location, artist, venue, date, and genre
- **Interactive Map**: View event locations on an interactive map using Leaflet and OpenStreetMap
- **Event Details**: Detailed event pages with venue information and ticket links
- **Favorites**: Save events to favorites (stored in local storage)
- **Responsive Design**: Mobile-friendly interface with modern UI
- **No Authentication Required**: Public access for all users

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mbianchidev/find-concerts-io.git
cd find-concerts-io
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
```

The application is configured for static export and can be deployed to GitHub Pages.

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Leaflet with OpenStreetMap
- **Data**: Mock data based on Bandsintown API schema

## Project Structure

```
src/
├── app/                    # Next.js app router pages
├── components/             # Reusable React components
├── data/                   # Mock data and constants
├── lib/                    # Utility functions
└── types/                  # TypeScript type definitions
```

## API Reference

The application uses mock data based on the Bandsintown API schema defined in `bands-in-town.yaml`. The mock data includes events from popular artists across different venues worldwide.

## Deployment

This application is configured for deployment on GitHub Pages with static export. The build output is optimized for static hosting.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.