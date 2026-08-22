<div align="center">

<img src="assets/logo.png" width="160" height="160" alt="GlobeTrotter Logo" style="border-radius: 50%; box-shadow: 0 12px 36px rgba(245, 180, 41, 0.25);" />

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

## Sample Itinerary PDF Export

Experience the magazine-grade offline travel booklet generated directly by GlobeTrotter:

📄 **[Download & View Sample Itinerary PDF (Trip Across South India)](assets/Trip_across_South_India_Itinerary.pdf)**

---

## Visual Showcase & Screenshots

### 1. Landing Page & Value Proposition
*Modern hero presentation showcasing live interactive itinerary demos, quick destination searches, and core feature pillars.*

![Landing Page Showcase](assets/screenshots/01_landing_page.png)

---

### 2. Authentication & Secure Gateway
*Streamlined authentication interface supporting secure email/password login and Supabase OAuth integration.*

![Login & Auth](assets/screenshots/02_login_auth.png)

---

### 3. Traveler Control Dashboard
*Central control center displaying upcoming itineraries, countdown telemetry, financial summary widgets, and bookmarked place stash.*

![Traveler Dashboard](assets/screenshots/03_travel_dashboard.png)

---

### 4. Interactive Monthly Travel Calendar
*Full-month visual planner highlighting scheduled trip dates, destination tags, flights, stays, food spots, and daily activity pills with 1-click day navigation.*

![Monthly Travel Calendar](assets/screenshots/04_calendar_itinerary_view.png)

---

### 5. Travel Budget & Financial Analytics
*Deep financial telemetry providing geographic spending analysis across destinations and proportional category distribution.*

![Budget & Financial Analytics](assets/screenshots/04_budget_financial_analytics.png)

---

### 6. Traveler Profile & Preferences
*Personalized traveler hub featuring custom monogram badge selection, travel style toggles, and regional currency settings.*

![Profile & Settings](assets/screenshots/05_profile_settings.png)

---

### 7. Executive Administration & Platform Telemetry
*Dedicated `/admin` management console featuring 6-month growth trajectories, weekly engagement bar charts, and destination rankings.*

![Admin & Platform Telemetry](assets/screenshots/06_admin_analytics.png)

---

## Key Capabilities & System Features

### 1. Interactive Multi-City Day Planner & Calendar
- **Dynamic Timeline Sequencing**: Build granular day-by-day travel schedules with sequential stops and time slot scheduling.
- **Monthly Interactive Calendar**: Full-calendar overview mapping multi-city spans, airline transit legs, and day cards.
- **Categorized Drawers**: Seamlessly manage 7 experience categories: *Sightseeing*, *Food & Dining*, *Stays & Hotels*, *Flights & Transit*, *Adventures*, *Culture & Arts*, and *Notes*.
- **Interactive GIS Map Visualization**: Real-time Leaflet & OpenStreetMap view rendering route polylines and interactive pin markers with popup details.

### 2. Voyage AI Concierge
- **Context-Aware Assistance**: Powered by Groq high-throughput LLMs to suggest custom day plans, packing recommendations, budget advice, and local food spots.
- **1-Click Itinerary Insertion**: Add AI-recommended attractions and activities directly into active travel itineraries.

### 3. Smart Discovery & Global Stash
- **Live Place Discovery**: Real-time place searches by city and category with Wikipedia imagery, tags, ratings, and estimated costs in INR (₹).
- **Global Saved Places Pool**: Save places across searches into a persistent personal stash for later itinerary assignment.

### 4. Financial Telemetry & Budget Optimization
- **Per-Trip Budget Tracking**: Compare planned costs against target budgets with color-coded alerts and category breakdown gauges.
- **Global Multi-Trip Analytics**: Cross-itinerary expense comparisons, average daily spend tracking, and multi-currency converter (INR, USD, EUR, GBP, JPY, AED).

### 5. Community Sharing & Export Engine
- **Read-Only Public URLs**: Frictionless itinerary sharing with 1-click WhatsApp, X, and link copy buttons.
- **Magazine-Quality PDF Export**: Formatted printable itinerary booklets for offline access.

### 6. Executive Administration & Live Telemetry Console
- **Dedicated Standalone Gateway**: Secure access control at `/admin` (Passkey: `admin2026`).
- **Telemetry Visualizations**: 6-Month Itinerary Trajectory Area Charts, Weekly Traveler Activity Bar Charts, Interactive Category Expenditure Donut, and Geographic Destination Rankings.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (React 18 + Vite)"]
        Landing["Landing Showcase Page"]
        Dashboard["Traveler Dashboard"]
        Planner["Interactive Day Planner & Map"]
        Calendar["Interactive Monthly Calendar View"]
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
├── assets/                  # Brand assets, project logo, screenshots & sample PDF
│   ├── logo.png
│   ├── Trip_across_South_India_Itinerary.pdf
│   └── screenshots/
│       ├── 01_landing_page.png
│       ├── 02_login_auth.png
│       ├── 03_travel_dashboard.png
│       ├── 04_calendar_itinerary_view.png
│       ├── 04_budget_financial_analytics.png
│       ├── 05_profile_settings.png
│       └── 06_admin_analytics.png
├── backend/                 # Python Flask REST API
│   ├── app.py               # Main Flask server & route handlers
│   ├── requirements.txt     # Backend dependencies
│   └── .env.example         # Environment template
├── frontend/                # React 18 + Vite application
│   ├── src/
│   │   ├── components/      # UI components (TripMap, Icons, AIChatDrawer)
│   │   ├── pages/           # Application views (DayPlanner, AdminAnalytics, etc.)
│   │   ├── context/         # React Context providers (ToastContext)
│   │   ├── api.js           # Centralized API client with in-memory caching
│   │   ├── supabaseClient.js# Supabase client configuration
│   │   └── index.css        # Global design system & theme tokens
│   ├── public/              # Static public assets (logo.png, favicon.png)
│   ├── package.json         # Node dependencies & build scripts
│   └── vite.config.js       # Vite configuration with vendor code-splitting
└── README.md                # Project documentation
```

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.9 or higher
- **Supabase Account & Groq API Key**

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
*Backend runs locally on `http://127.0.0.1:5000`.*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs locally on `http://localhost:5173`.*

---

## License & Acknowledgements

Created with ❤️ by **Kavin Jindal**, **Sarthakk Anjariya**, **Pooja Teotia**, and **Ishita Mehta** for the **Odoo x LDCE Hackathon 2026**.
