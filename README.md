# Weather Dashboard - Interactive Dutch Weather Visualization

A modern, real-time weather dashboard for the Netherlands featuring interactive map visualizations and comprehensive weather data. Built with Angular 19, GraphQL, and Leaflet.

![Angular](https://img.shields.io/badge/Angular-19.2-DD0031?logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Material Design](https://img.shields.io/badge/Material-19.2-757575?logo=material-design)

## 🎯 Project Overview

This application provides a comprehensive weather monitoring system that:

- Displays real-time weather data from 40+ Dutch meteorological stations
- Visualizes temperature, wind flow, and air pressure patterns on an interactive map
- Offers a clean, minimalist UI with advanced data visualization techniques
- Updates automatically via GraphQL subscriptions

**Data Source**: [Buienradar API](https://data.buienradar.nl/2.0/feed/json) - Official Dutch weather data

---

## 🏗️ Architecture & Tech Stack

### Frontend

- **Framework**: Angular 19 (Standalone Components)
- **State Management**: Signals-based reactive store
- **UI Components**: Angular Material 19
- **Map Engine**: Leaflet with custom renderers
- **Data Layer**: Apollo GraphQL Client
- **Styling**: SCSS with modern CSS features (backdrop-filter, gradients)
- **Geospatial**: Turf.js for geographic calculations

### Backend

- **Server**: Node.js with GraphQL Yoga
- **API**: GraphQL with Query & Subscription support
- **Real-time**: PubSub for live weather updates
- **Data Transformation**: Lodash for aggregations

### Key Libraries

```json
{
  "leaflet": "Interactive maps with custom overlays",
  "turf.js": "Geospatial analysis (voronoi, interpolation)",
  "d3-scale": "Color scaling for temperature/pressure",
  "apollo-client": "GraphQL data fetching",
  "rxjs": "Reactive programming patterns"
}
```

---

## ✨ Key Features

### 1. **Interactive Map Visualizations**

Three distinct rendering modes with custom implementations:

- **Temperature (Glow Mode)**:

  - Voronoi tessellation for spatial interpolation
  - Color-coded gradients (blue → cyan → yellow → red)
  - Flag-style markers with dynamic coloring

- **Wind Flow**:

  - Animated wind arrows showing direction
  - Pulsing animation based on wind speed
  - Visual representation of gusts

- **Air Pressure (Bubble Mode)**:
  - Sized bubbles representing pressure levels
  - Color-coded from low (blue) to high (red)
  - Spatial distribution visualization

### 2. **Floating Chips Navigation**

- Minimalist circular chips that expand on hover
- Smooth animations with cubic-bezier easing
- Positioned centrally above the map
- Fully accessible with ARIA labels

### 3. **5-Day Forecast**

- Compact horizontal layout
- Weather icons with temperature ranges
- Rain probability indicators
- Semi-transparent glass morphism design

### 4. **Station Detail Panel**

- Real-time metrics for selected stations
- Clean, list-based layout with subtle dividers
- Comprehensive data: temperature, humidity, wind, pressure, visibility
- Atmospheric snapshot with sunrise/sunset times

### 5. **Real-time Updates**

- GraphQL subscriptions for live data
- Auto-refresh every 60 seconds (configurable)
- Last updated timestamp in map attribution
- Loading states with Material progress indicators

---

## 🎨 Design System

### Design Principles

- **Minimalism**: Clean, distraction-free interface
- **Data Hierarchy**: Visual weight based on importance
- **Responsiveness**: Fluid layouts from mobile to 4K displays
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML

### Color Palette

```scss
Primary: #3b82f6 (Blue)
Background: #f5f7fb (Light Gray)
Text Primary: #0f172a (Dark Slate)
Text Secondary: #64748b (Slate)
Accent: #0891b2 (Cyan)
```

### Typography

- **Font Family**: Inter, Segoe UI, system-ui
- **Scale**: Modular scale with negative letter-spacing for headings
- **Weights**: 400 (regular), 500 (medium), 600 (semibold)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the development server (client + GraphQL server)
npm start
```

The application will be available at:

- **Frontend**: http://localhost:4200
- **GraphQL Playground**: http://localhost:4000/graphql

### Alternative: Run Separately

```bash
# Terminal 1: Start GraphQL server
npm run serve:server

# Terminal 2: Start Angular app
npm run serve:client
```

### Build for Production

```bash
npm run build
```

Build artifacts will be stored in `dist/weather-dashboard/`.
