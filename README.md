# SafeHer

SafeHer is a privacy-focused, mobile-first women safety application designed to work reliably even when the internet connection is weak or unavailable. Built as a progressive web app (PWA), SafeHer brings emergency support, location-aware safety tools, and offline access into one secure, fast, and easy-to-use experience.

The platform is designed for real-world safety scenarios where every second matters. Whether the user is commuting, travelling alone, returning home late, or facing an uncertain environment, SafeHer helps them respond quickly, notify trusted contacts, and access essential safety information without depending on constant connectivity.

## Why SafeHer

Women’s personal safety requires more than a panic button. It requires a system that remains usable in emergencies, stores critical information locally, and supports action even when a network is unavailable.

SafeHer addresses this need by combining:

- instant emergency alerting
- offline-safe access to nearby safety resources
- local storage for emergency data and personal details
- trusted contact management
- discreet safety tools for difficult situations
- privacy-aware design for sensitive personal data

## Key Features

### 1. Emergency SOS workflow
- One-tap emergency response
- Automatic SMS alerts to guardians and emergency contacts
- Optional emergency call to a configured contact
- Real-time or last-known location sharing
- Safe status confirmation when the user is no longer in danger

### 2. Offline-first access
- Works as a standalone PWA on mobile devices
- Service worker caching for offline app load and static assets
- Local database storage using IndexedDB
- Queued emergency actions that retry automatically when connectivity returns
- Downloadable safety-zone and map data for use without a live connection

### 3. Nearby safety resources
- Map-based view of nearby safe locations
- Offline safe-zone datasets for multiple Indian states
- Search for locations along a route
- Community report support for lighting and crowd conditions
- Location-based route-aware safety discovery

### 4. Guardian and emergency contact management
- Add and prioritize up to five trusted guardians
- Configure a default emergency contact
- Custom alert templates for SMS messages
- Contact-level emergency routing and escalation

### 5. Personal safety tools
- Siren mode
- Torch and strobe support
- Fake call feature to help exit uncomfortable situations
- Walk timer and check-in reminders
- Stealth/disguise mode for safer usage in public settings
- Lock screen protection and app-level security controls

### 6. Privacy and security
- Sensitive personal data stored locally and encrypted
- App lock with PIN, pattern, or biometric support
- Secure handling of emergency records and media
- Focused attention on user privacy and data minimization

## Offline-First Architecture

SafeHer is built with offline resilience as a first-class requirement.

- The app is installable like a native app through a PWA shell.
- Core UI and static resources are cached for offline access.
- Location and route information can be used even without live connectivity.
- Safety-zone datasets are stored locally and refreshed as needed.
- Emergency actions are queued in the browser database and sent when the device reconnects.
- This ensures that the app remains useful in unstable or no-network situations.

## Technology Stack

SafeHer is built using modern web technologies:

- React + Vite for the frontend
- Tailwind CSS for responsive UI styling
- Framer Motion for interface motion effects
- Leaflet + React LeafMap for map functionality
- IndexedDB for local persistence
- Workbox / Vite PWA plugin for offline support and caching
- Vercel serverless API for emergency SMS and calling flows

## Project Structure

```text
safeher/
├── api/
│   └── sos.js                 # Twilio-based emergency SOS API
├── public/
│   ├── data/
│   │   └── zones/             # Offline-safe zone dataset
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon.svg
│   └── ...
├── src/
│   ├── components/            # UI and safety feature components
│   ├── context/               # App, auth, and safety state
│   ├── hooks/                 # Geolocation, motion, power, recorder hooks
│   ├── pages/                 # App screens (Home, Map, Tools, Guardians, Settings)
│   ├── services/              # DB, location, alerting, sync, and offline logic
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── scripts/
│   └── ...                    # Zone conversion and generation scripts
├── index.html
├── package.json
├── vite.config.js
├── postcss.config.js
├── tailwind.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

This starts the Vite development server and allows the app to run locally in a browser.

### Production build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Emergency SMS / Calling Setup

SafeHer includes a backend API for SMS and automated emergency calls. The serverless function in `api/sos.js` uses Twilio.

Add the following environment variables in your deployment environment (for example Vercel):

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_twilio_number
TWILIO_MESSAGING_SERVICE_SID=optional_messaging_service_sid
DEFAULT_COUNTRY_CODE=+91
ALLOWED_ORIGINS=https://your-app-domain.com
```

If these values are not configured, the app still remains usable for local emergency workflows, but external alert delivery may be limited.

## Safety and Privacy Notes

SafeHer is designed with user safety and privacy in mind:

- personal profiles and emergency data are kept local whenever possible
- encrypted storage reduces exposure of sensitive information
- emergency contact data is managed by the user
- the app supports discreet operation in hostile or high-stress conditions
- offline-first design ensures the app remains useful even during network outages

## Use Cases

SafeHer is built for:

- women travelling alone or late at night
- users needing rapid access to emergency contacts
- people in areas with weak or inconsistent network access
- commuters who need nearby safe zones and route-aware safety guidance
- users who want a discreet, privacy-aware personal safety tool

## Future Scope

This project has strong potential for expansion into:

- multilingual support and region-specific safety guidance
- enhanced offline map intelligence
- community reporting and incident visibility
- deeper analytics for incident trends
- emergency integration with public safety systems and local agencies

## Contribution

Contributions are welcome. If you want to improve SafeHer, open an issue or submit a pull request with a clear explanation of the change and its safety impact.

## Summary

SafeHer is not just another emergency app — it is a resilient, privacy-aware safety platform engineered for real-world uncertainty. By combining offline-first design, emergency response tools, trusted contact management, and accessible safety resources, SafeHer helps users act with more confidence when they need it most.
