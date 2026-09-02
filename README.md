# FraudCheck

An AI-powered tool to help users detect fraud in online rental and accommodation listings before booking.

---

## Live Demo

**Application:** [https://listing-fraud-check-ai-three.vercel.app/](https://listing-fraud-check-ai-three.vercel.app/)

**API:** [https://listing-fraud-check-api-999434601012.us-central1.run.app](https://listing-fraud-check-api-999434601012.us-central1.run.app)

---

## About

FraudCheck analyzes rental listings (Idealista, Fotocasa, Airbnb, Booking, and more) and runs a multi-layered forensic check to surface common fraud signals. Users can paste listing text or use the Chrome extension to analyze any listing in one click.

### How It Works

1. **Extract**: Paste listing text or use the extension. An AI model extracts key fields (address, price, host details).
2. **Verify**: Confirm the location on an interactive map with a draggable marker (Geocoding API).
3. **Analyze**: Parallel background jobs run a deep analysis:
   - **Location**: Address validation and neighborhood context via Places API.
   - **Image Forensics**: Reverse image search and AI-generated photo detection.
   - **Price Check**: AI evaluation of price vs. location market rate.
   - **Reputation**: Web search for negative feedback associated with the host or address.
4. **Results**: Authenticity score, detailed findings breakdown, and interactive map.
5. **Q&A**: Chat interface to ask follow-up questions about the report.

---

## Chrome Extension

Supports: Idealista, Fotocasa, Booking, Airbnb, Pisos.com, Habitaclia, Milanuncios, Wallapop, VRBO, Expedia, TripAdvisor.

Extracts text and images from the listing page and sends them directly to the analysis pipeline.

---

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI (Python 3.12)
- **Database**: PostgreSQL (Supabase)
- **Task Queue**: Redis (Upstash) + RQ
- **AI**: Google Gemini (extraction, analysis, Q&A) + Google Vision + Google Maps Platform
- **Deployment**: Google Cloud Run (API) + Vercel (Frontend)

---

## Setup

See [INSTALL.md](INSTALL.md) for local setup instructions.
