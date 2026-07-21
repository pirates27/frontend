# LandLens 🌍🔍

<p align="center">
  <img src="./public/logo.png" alt="LandLens Logo" width="250"/>
</p>

### 🚀 **Live Production URL:** [https://dpyyh7torlown.cloudfront.net](https://dpyyh7torlown.cloudfront.net)

An AI-powered government land verification portal designed to prevent real estate fraud, overlap claims, and forgery using AI trust scores, OCR verification, and 360° virtual tours.

<!-- ![LandLens Preview](https://i.ibb.co/ccmGDYJT/5ea71be8-b3a8-4cc7-84c6-ec15a7d6b37d.jpg) -->

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

### 💡 AI Price Estimation Flow Diagram
This sequence diagram illustrates how the backend AI Price Estimation service processes valuation requests using survey coordinates, historical market rates, and GIS benchmarks.

```mermaid
sequenceDiagram
    participant User as Buyer / Provider
    participant React as React Frontend
    participant Gateway as AWS CloudFront / ALB
    participant AI as Spring Boot AI Engine
    participant DB as Hostinger MySQL DB

    User->>React: Input Survey No, Area & Coordinates
    React->>Gateway: POST /api/ai/estimate-price
    Gateway->>AI: Forward Valuation Request
    AI->>DB: Fetch Local Historical Sales & Base Govt Rates
    DB-->>AI: Return Comparative Benchmark Data
    AI->>AI: Execute ML Valuation Model (Base Price * GIS Multipliers)
    AI-->>Gateway: Return Estimated Range, Price/SqFt & Confidence Score
    Gateway-->>React: JSON Response Payload
    React-->>User: Render Interactive Valuation Breakdown
```

### 🛠️ System Maintenance & Health Lifecycle
Operational maintenance workflow ensuring 24/7 service availability, zero-downtime rolling deployments, health monitoring, and automated backups.

```mermaid
flowchart TD
    subgraph Monitoring [Continuous Monitoring & Health]
        CW[AWS CloudWatch Metrics] -->|Poll Health Endpoint| ECS[ECS Fargate Tasks]
        ALB[Application Load Balancer] -->|HTTP Health Checks| ECS
    end

    subgraph Maintenance [Maintenance & Rolling Deployments]
        DEV[Developer Push] -->|Build & Push Docker Image| ECR[AWS ECR]
        ECR -->|Trigger Rolling Deployment| ECS
        ECS -->|Drain & Terminate| OLD[Old Container Tasks]
    end

    subgraph DBMaintenance [Database Maintenance & Backups]
        DB[(Hostinger MySQL DB)] -->|Daily Automated Snapshot| BackupStorage[S3 Backup Archive]
        DB -->|Scheduled Analytics Pruning| LogCleanup[Daily Analytics Task]
    end
```

---

## 📊 AWS Infrastructure & Usage Cost Projections

Estimated monthly AWS cloud hosting and maintenance costs scaled across active user tiers:

| User Scale | Frontend (S3 + CloudFront) | Backend API (ECS Fargate + ALB) | Database (MySQL / RDS) | Networking & Egress (NAT Gateway) | Total Estimated Monthly Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **100 Users** | **$0 - $2** *(CloudFront Free Tier)* | **$26 - $30** | **$10 - $15** *(Hostinger / Small)* | **$32 - $35** | **~$68 - $85 / mo** (~₹5.5k - ₹7k) |
| **1,000 Users** | **$2 - $5** | **$45 - $55** | **$25 - $40** *(RDS db.t4g.small)* | **$35 - $40** | **~$110 - $140 / mo** (~₹9k - ₹11.5k) |
| **10,000 Users** | **$100 - $150** | **$165 - $230** | **$150 - $250** *(RDS Multi-AZ)* | **$60 - $90** | **~$600 - $800 / mo** (~₹50k - ₹66k) |
| **100,000 (1 Lakh)**| **$1,200 - $1,800** | **$950 - $1,450** | **$800 - $1,500** *(Aurora Serverless)* | **$200 - $350** | **~$3,500 - $5,000 / mo** (~₹2.9L - ₹4.1L) |

### 🛠️ Key Cost Drivers & Optimization Strategies
- **CloudFront Free Tier**: Provides 1 TB data transfer & 10M requests free per month.
- **S3 Gateway Endpoints**: Eliminates NAT Gateway data transfer charges for internal S3 asset fetches.
- **ECS & RDS Savings Plans**: Committing 1-year reserved instances yields 40%–60% cost reductions.

---
*Built as part of a modernization migration from Angular to React + Vite. The migration is fully complete, porting all dashboards, UI elements, and API integrations with exact fidelity.*
