
# 🛡️ SafeHer — Offline-First Women's Safety Progressive Web App

[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3+-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Twilio](https://img.shields.io/badge/Twilio-SOS_API-F22F46?style=flat-square&logo=twilio&logoColor=white)](https://www.twilio.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)

**SafeHer** is a privacy-first, offline-resilient Progressive Web App (PWA) engineered to provide reliable emergency response, geospatial safe-zone discovery, and discreet personal defense tools—even in cellular dead zones or complete network outages.

---

## 🎯 The Problem & Solution

**The Problem:** Most personal safety and panic-button applications fail in real-world emergencies because they depend on constant high-speed internet and cloud-hosted databases. When a user enters an underground transit station, rural highway, or congested area, standard apps stall, fail to load maps, or drop SOS alerts.

**The SafeHer Solution:** SafeHer treats **offline resilience and local privacy** as core architectural requirements rather than afterthoughts:
- **Zero-Network App Execution:** Cached via Workbox service workers to launch instantaneously without an internet connection.
- **Store-and-Forward SOS Queue:** Emergency alerts are saved locally in IndexedDB and automatically dispatched via Twilio SMS/Voice the moment connectivity returns.
- **On-Device Encryption:** Sensitive guardian details, medical info, and emergency logs stay encrypted on the user's device—eliminating central server data leaks.

---

## ✨ Key Features

### 🚨 1. Resilient Emergency SOS Workflow
- **One-Tap Escalation:** Triggers simultaneous SMS alerts and automated voice calls to prioritized guardians.
- **Smart Location Fallback:** Transmits live GPS coordinates or automatically falls back to the last cached high-accuracy coordinates if GPS/data is restricted.
- **Background Sync Queue:** Queues failed network payloads in IndexedDB and retries automatically upon reconnection.
- **"I Am Safe" Resolution:** One-tap status broadcast to notify guardians once the user reaches safety.

### 📴 2. True Offline-First Architecture
- **Installable Native-Like PWA:** Runs standalone on Android and iOS home screens with full-screen support.
- **Pre-Cached Safe-Zone Datasets:** Downloadable regional JSON/GeoJSON datasets covering safe zones across multiple Indian states.
- **Offline Map & Route Discovery:** Interactive Leaflet maps capable of rendering cached safe locations and route corridors offline.

### 🕵️ 3. Discreet & Tactical Safety Utilities
- **Stealth / Disguise Mode:** Instantly masks the interface as an everyday utility app to prevent escalation if an attacker inspects the phone.
- **Simulated Fake Call:** Schedules a realistic incoming call screen with custom caller ID to help users exit uncomfortable situations.
- **Walk Timer & Check-In:** Automated countdown timer that triggers an SOS alert if the user fails to check in on time.
- **Acoustic & Visual Deterrents:** High-decibel emergency siren and high-frequency flashlight/screen strobe.

### 🔐 4. Privacy & Access Control
- **Client-Side Encryption:** Personal profiles and emergency logs are encrypted before being written to IndexedDB.
- **Multi-Modal App Lock:** Protects app access and SOS cancellation behind a PIN, pattern, or WebAuthn biometric authentication.

---

## 🏗️ System Architecture & Offline Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                        SafeHer PWA Client                       │
│  ┌──────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │  React + UI  │◄─►│  Service Worker  │   │  Encrypted      │  │
│  │  (Leaflet)   │   │  (Workbox Cache) │   │  IndexedDB      │  │
│  └──────┬───────┘   └──────────────────┘   └────────▲────────┘  │
│         │                                           │           │
│         ▼ (Triggers SOS)                            │           │
│  ┌──────────────────────────────────────────────────┴────────┐  │
│  │             Offline Sync & Retry Manager                  │  │
│  └──────────────────────────────┬────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────┘
                                  │ (Online / Upon Reconnect)
                                  ▼
                   ┌──────────────────────────────┐
                   │   Vercel Serverless Function  │
                   │          (/api/sos)          │
                   └──────────────┬───────────────┘
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │     Twilio SMS & Voice API    │
                   │   (Dispatches to Guardians)   │
                   └──────────────────────────────┘

```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend & UI** | React, Vite, Tailwind CSS, Framer Motion |
| **Offline & Storage** | Workbox (`vite-plugin-pwa`), IndexedDB, Web Crypto API |
| **Maps & Geospatial** | Leaflet, React-Leaflet, Custom Regional GeoJSON Datasets |
| **Backend & Alerts** | Vercel Serverless Functions (Node.js), Twilio REST API (SMS & Voice) |

---

## 📂 Project Structure

```text
safeher/
├── api/
│   └── sos.js                 # Serverless endpoint for Twilio SMS & Voice dispatch
├── public/
│   ├── data/zones/            # Pre-compiled offline safe-zone datasets (by state)
│   └── icons/                 # PWA manifest icons & splash assets
├── scripts/
│   └── ...                    # Data pipeline scripts for formatting safe-zone GeoJSON
├── src/
│   ├── components/            # Modular UI, SOS triggers, stealth overlays & tools
│   ├── context/               # Global safety state, auth lock, and alert context
│   ├── hooks/                 # Custom hooks (useGeolocation, useMotion, useRecorder)
│   ├── pages/                 # Core views (Home, SafeMap, SafetyTools, Guardians, Settings)
│   ├── services/              # IndexedDB wrapper, encryption, offline sync queue & API clients
│   ├── App.jsx
│   └── main.jsx
├── vite.config.js             # Vite & Workbox PWA caching configuration
└── package.json

```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js** `v18.0+`
* **npm** or **yarn**
* A **Twilio Account** *(optional — required only for live external SMS/Voice dispatch)*

### 1. Clone & Install

```bash
git clone [https://github.com/adithyanm1982-gif/Safeher.git](https://github.com/adithyanm1982-gif/Safeher.git)
cd Safeher
npm install

```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (or configure these in your Vercel project settings):

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=optional_messaging_service_sid
DEFAULT_COUNTRY_CODE=+91
ALLOWED_ORIGINS=http://localhost:5173,[https://your-production-domain.vercel.app](https://your-production-domain.vercel.app)

```

> **Note:** If Twilio credentials are omitted, SafeHer still operates in full offline/local mode—allowing you to test PWA caching, encrypted IndexedDB storage, safe-zone mapping, and all tactical safety tools.

### 3. Run Locally

```bash
# Start development server
npm run dev

# Build for production & preview PWA service worker locally
npm run build
npm run preview

```

---

## 🗺️ Roadmap

* [ ] **Peer-to-Peer Mesh Fallback:** Bluetooth Web API / WebRTC local mesh relay for zero-cellular SOS hopping.
* [ ] **Multilingual Localization:** Support for Tamil, Hindi, Malayalam, Telugu, and Kannada interfaces.
* [ ] **Hardware Trigger Integration:** Shake-to-SOS and power-button press pattern detection.
* [ ] **Verified Safe-Zone Crowdsourcing:** Upvote/verify community reports on street lighting and late-night crowd density.

---
