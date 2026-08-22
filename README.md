<div align="center">

<img src="assets/logo.png" width="180" height="180" alt="GlobeTrotter Logo" style="border-radius: 50%; box-shadow: 0 12px 36px rgba(245, 180, 41, 0.25);" />

# GlobeTrotter

### Intelligent Multi-City Itinerary Architect & AI Travel Concierge

**Built with pride for the Odoo x LDCE Hackathon 2026**

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Flask](https://img.shields.io/badge/Flask_REST_API-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Supabase](https://img.shields.io/badge/Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq AI](https://img.shields.io/badge/Groq_Llama_3-F55036?style=for-the-badge&logo=openai&logoColor=white)](https://groq.com/)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)

---

</div>

## Executive Overview

**GlobeTrotter** is a modern, full-stack travel intelligence platform engineered to eliminate the fragmentation and friction of multi-city journey planning. Built for the **Odoo x LDCE Hackathon**, it combines real-time geographic discovery, dynamic day-by-day route sequencing, AI travel concierges, multi-currency budget optimizers, public community sharing, and standalone executive telemetry in a single, glassmorphic web application.

---

## Team Members & Hackathon Attribution

> **Event**: Built for Odoo x LDCE Hackathon 2026

- **Kavin Jindal**
- **Sarthakk Anjariya**
- **Pooja Teotia**
- **Ishita Mehta**

---

## Key Capabilities & System Features

### 1. Interactive Multi-City Day Planner
- **Dynamic Timeline Sequencing**: Build granular day-by-day travel schedules with sequential stops and time slot scheduling.
- **Categorized Drawers**: Seamlessly manage 7 experience categories: *Sightseeing*, *Food & Dining*, *Stays & Hotels*, *Flights & Transit*, *Adventures*, *Culture & Arts*, and *Other Activities*.
- **Interactive GIS Map Visualization**: Real-time Leaflet & OpenStreetMap view rendering route polylines and interactive pin markers with popup details.

### 2. Voyage AI Concierge
- **Context-Aware Assistance**: Powered by Groq high-throughput LLMs to suggest custom day plans, packing recommendations, budget advice, and local food spots.
- **1-Click Itinerary Insertion**: Add AI-recommended attractions and activities directly into active travel itineraries.

### 3. Smart Discovery & Global Stash
- **Live Place Discovery**: Real-time place searches by city and category with Wikipedia imagery, tags, ratings, and estimated costs in INR (Rs.).
- **Global Saved Places Pool**: Save places across searches into a persistent personal stash for later itinerary assignment.

### 4. Financial Telemetry & Budget Optimization
- **Per-Trip Budget Tracking**: Compare planned costs against target budgets with color-coded alerts and category breakdown gauges.
- **Global Multi-Trip Analytics**: Cross-itinerary expense comparisons, average daily spend tracking, and multi-currency converter (INR, USD, EUR, GBP, JPY, AED).

### 5. Community Sharing & Export Engine
- **Read-Only Public URLs**: Frictionless itinerary sharing with 1-click WhatsApp, X, and link copy buttons.
- **Magazine-Quality PDF Export**: Formatted printable itinerary booklets for offline access.

### 6. Executive Administration & Live Telemetry Console
- **Dedicated Standalone Gateway**: Secure access control at `/admin` (Passkey: `admin2026`).
- **Telemetry Visualizations**: 6-Month Itinerary Trajectory Area Charts, Weekly Traveler Activity Bar Charts, Interactive Category Expenditure Donut, and Geographic Destination Rankings with landmark-to-city resolution.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (React 18 + Vite)"]
        Landing["Landing Showcase Page"]
        Dashboard["Traveler Dashboard"]
        Planner["Interactive Day Planner & Map"]
        AI["Voyage AI Concierge Drawer"]
        Admin["Executive Admin Console"]
    end

    subgraph Server["API Core (Python Flask REST Microservice)"]
        TripRoutes["Trip & Itinerary Route Handlers"]
        AnalyticsEngine["Financial & Geographic Aggregators"]
        AIRoutes["Groq LLM Streaming & AI Handlers"]
        AdminService["Platform Telemetry & Landmark Mapper"]
    end

    subgraph Data["Cloud & Storage Services"]
        SupabaseDB[("Supabase PostgreSQL DB")]
        SupabaseAuth["Supabase Authentication (JWT)"]
        OSM["OpenStreetMap / Nominatim GIS Engine"]
        GroqCloud["Groq Cloud Llama-3 LLM Engine"]
    end

    Client --> Server
    Planner --> OSM
    AI --> AIRoutes
    Server --> SupabaseDB
    Server --> SupabaseAuth
    AIRoutes --> GroqCloud
```

---

## Technology Stack

| Domain | Technology | Specification & Usage |
| :--- | :--- | :--- |
| **Frontend UI** | React 18 + Vite | Declarative component hierarchy with fast HMR |
| **Design System** | Custom Vanilla CSS | Glassmorphism, warm ambient background gradients, Outfit / Plus Jakarta Sans typography |
| **Mapping Engine** | Leaflet + OpenStreetMap | Interactive GIS map with coordinate bounds and polyline routes |
| **Backend REST API** | Python 3 / Flask | Lightweight microservice handling CRUD, calculations, and analytics |
| **Database & Auth** | Supabase PostgreSQL | Managed database with Row Level Security (RLS) and JWT auth |
| **AI LLM Pipeline** | Groq SDK (Llama-3-70B) | High-speed, context-aware itinerary and travel recommendations |
| **Document Export** | jsPDF & HTML2Canvas | Formatted offline PDF travel booklets |

---

## Directory Structure

```
globetrotter/
├── assets/                  # Brand assets & project logo
│   └── logo.png
├── backend/                 # Python Flask REST API
│   ├── app.py               # Main Flask server & route handlers
│   ├── requirements.txt     # Backend dependencies
│   └── .env.example         # Environment template
├── frontend/                # React 18 + Vite application
│   ├── src/
│   │   ├── components/      # UI components (TripMap, Icons, AIChatDrawer)
│   │   ├── pages/           # Application views (DayPlanner, AdminAnalytics, etc.)
│   │   ├── context/         # React Context providers (ToastContext)
│   │   ├── api.js           # Centralized API client
│   │   ├── supabaseClient.js# Supabase client configuration
│   │   └── index.css        # Global design system & theme tokens
│   ├── public/              # Static public assets (logo.png, favicon.png)
│   ├── package.json         # Node dependencies & build scripts
│   └── vite.config.js       # Vite configuration
└── README.md                # Project documentation
```

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.9 or higher

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the Flask API server
python app.py
```
*The backend service will be live at `http://localhost:5000`.*

### 3. Frontend Setup
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*The frontend application will be accessible at `http://localhost:5173`.*

---

## Admin Portal Quick Access

- **URL**: `http://localhost:5173/admin`
- **Administrator Email**: `admin@globetrotter.com`
- **Master Admin Passkey**: `admin2026`
- **Evaluator Access**: A 1-Click bypass button is available directly on the admin login screen for evaluators.

---

<div align="center">

**GlobeTrotter** · Developed for the **Odoo x LDCE Hackathon 2026**

</div>
