# LandLens 🌍🔍

An AI-powered government land verification portal designed to prevent real estate fraud, overlap claims, and forgery using AI trust scores, OCR verification, and 360° virtual tours.

![LandLens Preview](https://i.ibb.co/ccmGDYJT/5ea71be8-b3a8-4cc7-84c6-ec15a7d6b37d.jpg)

## 🚀 Features

- **Role-Based Dashboards**: Secure, distinct portals for Buyers, Providers, Government Officers, and Admins.
- **AI Trust Scores**: Automated validation of land documents (OCR) mapping to survey numbers to calculate forgery and overlap risk.
- **Interactive Maps**: Full Mapbox GL JS integration with boundary drawing, clustering, and local survey data overlays.
- **360° Virtual Tours**: Built-in immersive panorama viewer to inspect lands remotely without physical visits.
- **Glassmorphism UI**: Stunning, modern, responsive UI built with Tailwind CSS.

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS (v4 via PostCSS)
- **Icons**: Lucide React
- **Routing**: React Router DOM (v6)
- **HTTP Client**: Axios (with JWT Interceptors)
- **Mapping**: Mapbox GL JS

## ⚙️ Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/pirates27/frontend.git
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_MAPBOX_TOKEN=your_mapbox_public_token
   VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```
   *(Note: The `.env` file is git-ignored to protect your secrets.)*

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

## 📜 Project Structure
- `/src/components/shared`: Reusable UI components (Map, VerificationBadge, PanoramaViewer)
- `/src/pages`: Feature pages (Auth, Dashboards, PropertyDetail)
- `/src/services`: API connectors and Axios interceptor logic
- `/src/models`: TypeScript interfaces for the domain models
- `/src/components/guards`: Route protection logic (Guest/Protected/Redirect)

## 🤝 Contributing
Please ensure all pull requests pass TypeScript compilation (`npm run build`) before submitting.

---
*Built as part of a modernization migration from Angular to React + Vite. The migration is fully complete, porting all dashboards, UI elements, and API integrations with exact fidelity.*
