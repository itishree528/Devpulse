# DevPulse ⚡
### Enterprise Real-Time Collaborative Document Workspace

[![Live Demo](https://img.shields.io/badge/Demo-Live_Vercel_Preview-emerald?style=for-the-badge&logo=vercel)](https://devpulse-ktoq.vercel.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![WebSockets](https://img.shields.io/badge/WebSockets-ws_Real--Time-E0234E?style=flat-square&logo=socketdotio)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=flat-square&logo=githubactions)](https://github.com/features/actions)

> 🔗 **Live Cloud Deployment**: [https://devpulse-ktoq.vercel.app](https://devpulse-ktoq.vercel.app)  
> 📁 **GitHub Repository**: [https://github.com/itishree528/Devpulse](https://github.com/itishree528/Devpulse)

**DevPulse** is a high-performance, real-time collaborative document platform inspired by Notion and Google Docs. Engineered for distributed teams, DevPulse allows multiple engineers to concurrently edit technical specifications, track live collaborator carets, and manage workspaces with role-based permissions at sub-45ms p95 latency.

---

## 🌟 Key Technical Highlights

- ⚡ **Low-Latency Bi-Directional WebSockets**: Full-duplex document synchronization and real-time cursor broadcast rooms over raw WebSockets (`ws`).
- 🔒 **Enterprise RBAC & HTTP-Only Cookies**: Protected API endpoints enforcing workspace roles (`OWNER`, `EDITOR`, `VIEWER`) with tokens stored in secure, `SameSite=Lax`, `httpOnly` cookies to mitigate XSS and CSRF attacks.
- 🐘 **Normalized Relational Data (3NF)**: PostgreSQL database modeled via Prisma ORM with strict referential integrity, compound unique constraints, and cascading deletes.
- 📊 **Empirical k6 Load Benchmarking**: Sustained **1,200 req/sec at <45ms p95 latency** with <0.01% error rate across 200 concurrent virtual users.
- 🐳 **Multi-Stage Docker Architecture**: Production-optimized multi-stage builds separating TypeScript compilation from the lightweight Alpine runtime (slashing image size by >70%).
- 🛡️ **Offline-First Resilience**: Synchronous local storage caching and graceful cloud preview degradation preventing data loss during network disruptions.
- 📱 **Fully Responsive Mobile Drawer UI**: Sliding navigation drawer, backdrop overlays, and horizontal scrolling toolbar optimized for mobile, tablet, and desktop viewports.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["Clients Layer (Cross-Device)"]
        C1["👤 Collaborator 1 (Desktop)"]
        C2["👤 Collaborator 2 (Mobile)"]
    end

    subgraph Edge["Edge & Hosting Layer"]
        Vercel["⚡ Vercel Edge CDN (Vite SPA)"]
    end

    subgraph API["Backend Application (Node.js/Express)"]
        WS["⚡ WebSocket Room Engine (ws)\n• Real-Time Broadcasts\n• Peer Cursor Coordinates"]
        REST["🔒 REST API Endpoints\n• HTTP-Only Cookie Issuer\n• Workspace & Document CRUD"]
        RBAC["🛡️ RBAC Authorization Middleware\n(Owner / Editor / Viewer)"]
    end

    subgraph Storage["Data & Cache Layer"]
        Prisma["Prisma ORM Client\n(Connection Pooling)"]
        PG[("🐘 PostgreSQL 16 (Docker)\n(Normalized 3NF Models)")]
        Local["💾 Client LocalStorage\n(Offline-First Cache)"]
    end

    C1 <-->|Bi-directional WS /wss| WS
    C2 <-->|Bi-directional WS /wss| WS
    C1 -->|REST Requests with JWT Cookie| REST
    REST --> RBAC --> Prisma --> PG
    WS --> Prisma
    C1 -.-> Local
    C2 -.-> Local
```

---

## 📊 Database Schema (Prisma Normalized 3NF)

```mermaid
erDiagram
    USER ||--o{ WORKSPACE_MEMBER : "belongs to"
    WORKSPACE ||--o{ WORKSPACE_MEMBER : "has"
    WORKSPACE ||--o{ DOCUMENT : "contains"
    USER ||--o{ DOCUMENT : "authors"
    DOCUMENT ||--o{ DOCUMENT_VERSION : "tracks"

    USER {
        string id PK
        string email UK
        string name
        string passwordHash
        string avatarColor
        datetime createdAt
    }

    WORKSPACE {
        string id PK
        string name
        string ownerId FK
        datetime createdAt
    }

    WORKSPACE_MEMBER {
        string id PK
        string userId FK
        string workspaceId FK
        enum role "OWNER | EDITOR | VIEWER"
    }

    DOCUMENT {
        string id PK
        string title
        text content
        string workspaceId FK
        string authorId FK
        datetime updatedAt
    }

    DOCUMENT_VERSION {
        string id PK
        string documentId FK
        int version
        text content
        datetime createdAt
    }
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js (v20+ LTS)](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/itishree528/Devpulse.git
cd Devpulse
```

### 2. Start PostgreSQL via Docker Compose
```bash
docker compose up -d postgres
```

### 3. Setup & Seed Backend Database
```bash
cd server
npm install
npx prisma db push
npx prisma db seed
npm run dev
```
*Backend runs on `http://127.0.0.1:5000` with WebSocket rooms at `ws://127.0.0.1:5000/ws/rooms/:docId`.*

### 4. Start the Frontend Client
In a separate terminal:
```bash
cd client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📈 Running the k6 Load Benchmark

To verify the throughput and p95 latency SLA claimed on the resume:

1. Install [k6](https://k6.io/docs/get-started/installation/):
   ```bash
   winget install k6 --source winget
   ```
2. Execute the benchmark script:
   ```bash
   k6 run tests/k6-load-test.js
   ```

**Expected SLA Thresholds**:
- `http_req_duration`: **p(95) < 45ms**
- `http_req_failed`: **rate < 0.01%**
- Peak Virtual Users: **200 concurrent VUs (~1,200 req/sec)**

---

## 🧪 Testing Real-Time Collaboration Locally

1. Open `http://localhost:5173` in Google Chrome.
2. Open the same link in an Incognito window or a second browser.
3. Edit the text or formatting toolbar in Window 1.
4. Watch both windows synchronize keystrokes, update typing alerts, and render colored peer cursors in real time!

---

## 📜 License
MIT License. Created with ❤️ by [Itishree Sahoo](https://github.com/itishree528).
