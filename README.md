# AutoPark - Multi-Level Parking Garage Management System MVP

A full-stack, smart parking garage management system built with **React**, **Node.js/Express**, and **MongoDB**. Designed to handle real-world garage operations with strict spot allocation logic, tiered hourly pricing with daily caps, EV charger spot tracking, valet hand-offs, and automated nightly session resolution.

---

## Features & Business Rules

### 1. Spot Allocation Logic
- **Compact Vehicles**: Allocates available `Compact` stalls first (lowest level first, then lowest stall #); automatically falls back to an available `Standard` stall if all Compact stalls are occupied.
- **Standard Vehicles**: Strictly assigned to available `Standard` stalls only.
- **EV Vehicles**: Strictly assigned to available `EV` charging stalls only.
- **Concurrency & Anti-Double-Parking**: Atomic claims prevent race conditions and duplicate assignments.

### 2. Tiered Pricing & Daily Cap Engine
- **First Hour Rate**: Configurable (e.g. `$10.00`).
- **Additional Hour Rate**: Configurable cheaper rate (e.g. `$5.00/hr`).
- **Daily Cap**: Maximum charge per 24-hour cycle (e.g. `$40.00/24h`).
- **Duration Rounding**: Partial hours round up (`Math.ceil(durationInHours)`).
- **Formula**: `(Math.floor(hours / 24) * dailyCap) + Math.min(remHoursCost, dailyCap)`.

### 3. Twist Levels Implemented
- **Level 1 — T4 (Messy Data)**: Clean and import messy rate card text/JSON with currency symbols (`$`, `USD`, `EUR`), noisy strings (`" $7.50 / hr "`, `"28.00 bucks"`), and irregular key formats to set per-spot-type rates (`Compact`, `Standard`, `EV`).
- **Level 2 — T2 (Automation)**: Virtual garage clock and nightly auto-close job accessible via `POST /clock` (and `POST /api/clock`) that auto-closes and bills sessions parked over 24 hours.
- **Level 3 — T6 (Lifecycle)**: Valet hand-off (`POST /api/tickets/transfer`) to reassign an active session to a new license plate while preserving the assigned stall and original entry timestamp.

---

## Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Vanilla CSS (Glassmorphic dark design system).
- **Backend**: Node.js, Express, Mongoose ODM.
- **Database**: MongoDB.

---

## Project Structure

```
ParkingGarage/
├── client/                     # Frontend React Single Page App
│   ├── src/
│   │   ├── components/         # FloorMap, Stats, Gate Modals, Clock, Search, History
│   │   ├── services/           # REST API client
│   │   ├── App.jsx             # Main Application Controller
│   │   └── index.css           # Styling System
│   └── package.json
│
├── server/                     # Backend Node.js / Express REST API
│   ├── src/
│   │   ├── config/             # MongoDB connection
│   │   ├── controllers/        # Garage, Ticket, Pricing, Clock controllers
│   │   ├── models/             # ParkingSpot, Ticket, PricingConfig schemas
│   │   ├── routes/             # REST endpoints
│   │   ├── services/           # Allocation, Pricing, Rate Cleaner, Clock services
│   │   └── server.js           # Server entry point
│   ├── tests/                  # Automated verification & twists test suites
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (default: `mongodb://127.0.0.1:27017/parking_garage`)

### 1. Backend Setup
```bash
cd server
npm install
npm start
# Backend runs at http://localhost:5000
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

---

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/garage/overview` | Live summary stats, total/available spots, and EV count |
| `GET` | `/api/spots` | List all spots with occupancy and vehicle details |
| `POST` | `/api/garage/seed` | Re-seed/configure custom garage levels and spot distribution |
| `POST` | `/api/tickets/check-in` | Check in vehicle and atomically assign eligible spot |
| `POST` | `/api/tickets/check-out` | Check out vehicle, compute duration/fee, and free spot |
| `POST` | `/api/tickets/transfer` | Valet hand-off: transfer session to a new license plate |
| `GET` | `/api/tickets/search?plate=...` | Search active vehicle by plate with live accrued fee |
| `GET` | `/api/tickets/history` | Completed parking ledger |
| `GET` | `/api/config/pricing` | Get current rate card configuration |
| `PUT` | `/api/config/pricing` | Update pricing rates |
| `POST` | `/api/config/pricing/import-messy` | Import and sanitize messy rate card text/JSON |
| `POST` | `/clock` | Advance simulated time & trigger nightly 24h auto-close job |

---

## Automated Tests

Run the test suites in the `server` directory:

```bash
cd server

# 1. Base allocation & pricing tests
npm test

# 2. End-to-end API integration tests
node tests/e2e_api_test.js

# 3. Comprehensive Level 1, 2, 3 twist tests
node tests/twists_test.js
```
