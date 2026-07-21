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

## ☁️ AWS Integration & Deployment Architecture

LandLens uses a highly available, decoupled AWS architecture. The frontend is served globally via CloudFront CDN, while API requests are securely proxied to the backend running in private subnets on ECS Fargate.

```mermaid
graph TD
    Client((Client / Browser))
    
    subgraph Frontend [AWS Edge & Storage]
        CF[Amazon CloudFront CDN]
        S3[Amazon S3 Bucket<br>Static Assets]
    end
    
    subgraph Backend VPC [AWS VPC - ap-south-1]
        ALB[Application Load Balancer]
        
        subgraph Private Subnets
            ECS[ECS Fargate Tasks<br>Spring Boot API]
        end
        
        NAT[NAT Gateway]
    end
    
    DB[(Hostinger Remote MySQL)]

    Client -->|1. HTTPS Request| CF
    CF -->|2. Fetch Static UI| S3
    CF -->|3. Route /api/*| ALB
    ALB -->|4. HTTP 8080| ECS
    ECS -->|5. DB Queries| NAT
    NAT -->|6. Egress IP| DB
```

### Deployment Workflows

1. **Frontend Deployment**: 
   - Managed via GitHub Actions (`.github/workflows/deploy.yml`) or AWS CLI.
   - On push to `main`, the React app is built using `vite build`.
   - The `dist/` output is synced to the S3 bucket (`landlens-frontend-256845883985`) using `aws s3 sync`.
   - A CloudFront invalidation is triggered to serve the latest assets immediately.
   
2. **Backend Deployment**:
   - Managed via PowerShell/Bash scripts (`deploy.ps1`).
   - The Spring Boot app is compiled into a `.jar` file.
   - A Docker image is built and pushed to Amazon Elastic Container Registry (ECR).
   - The ECS Fargate service is updated to force a rolling deployment of the new container image behind the ALB.

---

## 🔄 System Flow & State Diagrams

### API Request Flow Diagram
How the frontend communicates with the backend APIs via CloudFront proxy.

```mermaid
sequenceDiagram
    participant User as User / Browser
    participant CloudFront as AWS CloudFront
    participant ALB as AWS ALB
    participant Spring as Spring Boot (ECS)
    participant DB as MySQL DB

    User->>CloudFront: 1. Navigate to https://dpyyh7torlown...
    CloudFront-->>User: 2. Return React UI (from S3)
    
    User->>CloudFront: 3. POST /api/properties (JWT)
    CloudFront->>ALB: 4. Proxy Request to Backend
    ALB->>Spring: 5. Route to Target Group
    
    Spring->>Spring: 6. Validate JWT Token
    Spring->>DB: 7. Insert Property Record
    DB-->>Spring: 8. Return Confirmation
    
    Spring-->>ALB: 9. HTTP 201 Created
    ALB-->>CloudFront: 10. HTTP 201 Created
    CloudFront-->>User: 11. Display Success Message
```

### Property Verification State Machine
This diagram illustrates the lifecycle of a property listing as it goes through the AI and Government verification workflow.

```mermaid
stateDiagram-v2
    [*] --> UPLOADED : User Submits Land Details
    
    UPLOADED --> AI_VERIFICATION_PENDING : Trigger OCR & AI Checks
    
    state AI_VERIFICATION_PENDING {
        [*] --> ExtractingDocuments
        ExtractingDocuments --> CalculatingTrustScore
        CalculatingTrustScore --> CheckingOverlap
    }
    
    AI_VERIFICATION_PENDING --> AI_REJECTED : Low Trust Score / Fraud Detected
    AI_VERIFICATION_PENDING --> PENDING_GOVT_AUDIT : AI Passed (Requires Manual Audit)
    
    PENDING_GOVT_AUDIT --> APPROVED : Inspector Approves
    PENDING_GOVT_AUDIT --> REJECTED : Inspector Rejects
    
    APPROVED --> LIVE : Listed on Marketplace
    LIVE --> DISPUTED : Community Reports Fraud
    
    DISPUTED --> PENDING_GOVT_AUDIT : Re-evaluation Triggered
    
    AI_REJECTED --> [*]
    REJECTED --> [*]
```

---
*Built as part of a modernization migration from Angular to React + Vite. The migration is fully complete, porting all dashboards, UI elements, and API integrations with exact fidelity.*
