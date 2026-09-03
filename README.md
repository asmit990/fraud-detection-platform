# Aegis — Real-Time Payment Fraud Detection Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-Event_Streaming-231F20?logo=apachekafka)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-Velocity_Cache-DC382D?logo=redis)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Atomic_Store-336791?logo=postgresql)](https://www.postgresql.org/)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-Forensic_ML-4285F4?logo=google)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)

An enterprise-grade, event-driven payment fraud detection engine built with TypeScript microservices and a modern React operations console. Evaluates high-velocity transaction streams in milliseconds using deterministic multi-rule scoring, Redis sliding-window counters, and Google Gemini AI for natural-language forensic reasoning.

Features **Stripe/IETF-standard Idempotency**, the **Transactional Outbox Pattern**, **Dead Letter Queue (DLQ) failure recovery**, and **1-click interactive demo mode**.

---

## 🌟 Live Interactive Showcase (Frontend)

> **🚀 Live Demo**: *[Deploy URL / Preview]*  
> *The hosted frontend functions as a self-contained, interactive operations console with simulated real-time telemetry. Anyone can test the triage workflow, risk scoring, and rule inspector with zero cloud backend dependencies.*

---

## System Architecture

```
                                  +-----------------------------+
                                  |     React Aegis Console     |
                                  |      (Vite + Tailwind)      |
                                  +--------------+--------------+
                                                 |
                                                 | HTTP POST /api/transactions
                                                 | Headers: Bearer <JWT>, Idempotency-Key: <UUID>
                                                 v
+---------------------------------------------------------------------------------------------------+
|                                      TRANSACTION SERVICE (Port 3001)                              |
|                                                                                                   |
|   +--------------------------+     +-------------------------------+     +--------------------+   |
|   |  JWT Auth & Validation   | --> | Stripe/IETF Idempotency Layer | --> | PostgreSQL (Atomic)|   |
|   +--------------------------+     | (SHA-256 Request Fingerprint) |     | - transactions     |   |
|                                    +-------------------------------+     | - outbox_events    |   |
|                                                                          +---------+----------+   |
|                                                                                    |              |
|                                                                                    v              |
|   Background Outbox Relay Worker (FOR UPDATE SKIP LOCKED) <------------------------+              |
+------------------------------------------------+--------------------------------------------------+
                                                 |
                                                 | Publishes event: "transactions"
                                                 v
+---------------------------------------------------------------------------------------------------+
|                                           APACHE KAFKA                                            |
|                                                                                                   |
|    Topic: "transactions" (Partitioned)  |  Topic: "transactions.dlq"  |  Topic: "alerts"          |
+----------------------+---------------------------------+---------------------------+--------------+
                       |                                 |                           |
                       | Consumed by fraud-service       | Dead Letter Queue         | High-risk alerts
                       v                                 v                           v
+--------------------------------------------------+   +-------------------+   +--------------------+
|                   FRAUD SERVICE                  |   | Poison Queue /    |   |   ALERT SERVICE    |
|                                                  |   | Failure Audit     |   | Nodemailer + SMTP  |
|   +------------------------------------------+   |   +-------------------+   +--------------------+
|   | Consumer Deduplication (Redis SET NX)    |   |                                     |
|   +------------------------------------------+   |                                     v
|   | 3-Attempt Exponential Backoff + DLQ      |   |                           +--------------------+
|   +------------------------------------------+   |                           |  Security Ops Email|
|   | 8 Deterministic Rules (Redis Cache)      |   |                           +--------------------+
|   +------------------------------------------+   |
|   | Google Gemini AI Forensic Reasoning      |   |
|   +------------------------------------------+   |
|   | Combined Score: (Rules * 0.4) + (AI * 0.6) | |
+--------------------------------------------------+
                       |
                       +---> Updates risk_score & fraud_status in PostgreSQL
```

---

## ⚡ Core Engineering Highlights

### 1. Enterprise Idempotency Engine (Stripe & IETF RFC Standard)
* **Deterministic Fingerprinting**: Computes a SHA-256 digest of `METHOD:PATH:BODY`.
* **Tamper Rejection (`422 Unprocessable Entity`)**: Reusing a completed key with modified parameters is immediately blocked.
* **Concurrency Locking (`409 Conflict`)**: Simultaneous requests with the identical key receive a `409` lock response with `Retry-After: 2` header.
* **Sub-20ms Cached Replays**: Successfully processed idempotency keys return instantaneous replays directly from PostgreSQL with header `Idempotency-Replay: true`.

### 2. Transactional Outbox Pattern
* Solves the dual-write problem across PostgreSQL and Apache Kafka.
* The transaction record and the domain event are written in a **single atomic PostgreSQL transaction** (`BEGIN ... COMMIT`).
* A dedicated background Outbox Relay polls unpublished records using `FOR UPDATE SKIP LOCKED` and streams them to Kafka, guaranteeing **At-Least-Once Delivery** even during broker restarts.

### 3. Dead Letter Queue (DLQ) & Failure Recovery
* Kafka consumer worker attempts transient event processing up to 3 times with incremental backoff delays.
* Unrecoverable poison payloads (corrupt JSON, schema mismatches) are automatically wrapped with diagnostic error envelopes and dispatched to `transactions.dlq` to prevent Kafka partition blocking.

### 4. Dual-Layer Risk Engine (Rules + Gemini ML)
1. **8 Parallel Deterministic Rules (Redis Sub-millisecond Execution)**:
   - **Large Amount**: Flags transactions exceeding $10,000 threshold (+40 pts).
   - **Velocity Counter**: Flags accounts making > 5 transactions in 10 minutes via Redis atomic `INCR` (+30 pts).
   - **Geo-Anomaly**: Detects impossible travel and country changes (+30 pts).
   - **Device Fingerprinting**: Identifies previously unseen device hashes (+25 pts).
   - **Night Activity**: Flags midnight payment spikes (1:00 AM – 5:00 AM) (+20 pts).
   - **IP Reputation**: Checks blacklisted subnets and TOR exit nodes (+35 pts).
   - **Consecutive Failed Attempts**: Triggers on 5+ sequential declined attempts (+30 pts).
   - **Unusual Merchant Category**: Flags high-risk industries (crypto, gambling, firearms) (+25 pts).
2. **Google Gemini 1.5 Flash AI Reasoning (60% Weight)**:
   - Evaluates contextual anomalies and provides explainable forensic reasoning strings.
   - Built-in 3.5s timeout with automatic rule-based fallback.

---

## 💻 Project Structure

```
fraud-platform/
├── frontend/                       # Aegis Operations Console (React + Vite)
│   ├── src/
│   │   ├── App.tsx                 # Main layout and router
│   │   ├── lib/api.ts              # API client with offline fallback simulation
│   │   └── pages/
│   │       ├── Landing.tsx         # Product overview & feature grid
│   │       ├── Auth.tsx            # 1-Click demo authentication & clearance
│   │       ├── Dashboard.tsx       # Live KPI metrics, hourly volume & geo charts
│   │       ├── Transactions.tsx    # Real-time event stream, rule breakdown & blocking
│   │       └── Settings.tsx        # High-frequency merchant safeguards & 2FA
│   ├── Dockerfile
│   └── package.json
│
└── backend/                        # Distributed Microservices Architecture
    ├── docker-compose.yml          # PostgreSQL, Redis, Kafka, Zookeeper, Kafka UI
    ├── init.sql                    # PostgreSQL schema migrations & tables
    ├── package.json
    ├── scripts/
    │   └── simulate.ts             # High-throughput mock traffic generator
    └── services/
        ├── transaction-service/    # Ingestion API, Idempotency & Outbox Relay (Port 3001)
        ├── fraud-service/          # Kafka consumer, 8 Rules & Gemini AI ML Engine
        ├── analytics-service/      # Aggregation & metrics endpoints (Port 3003)
        └── alert-service/          # High-risk Kafka consumer & SMTP email dispatcher
```

---

## 🚀 Quick Start Guide

### Option A: Run the Frontend Standalone (Demo Mode)

To run the interactive UI console without starting databases or Docker:

```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser. All metrics, simulation events, and rule inspectors work out of the box with client-side fallback data.

---

### Option B: Run Full Microservices Backend (Docker)

#### 1. Launch Infrastructure
```bash
cd backend
docker-compose up -d
```
* PostgreSQL: `localhost:5432`
* Redis: `localhost:6379`
* Kafka Broker: `localhost:9092`
* Kafka UI: `http://localhost:8080`

#### 2. Start Microservices
```bash
# Terminal 1 — Transaction Ingestion Service (Port 3001)
cd backend/services/transaction-service && npm run dev

# Terminal 2 — Fraud Scoring Engine & AI
cd backend/services/fraud-service && npm run dev

# Terminal 3 — Analytics Service (Port 3003)
cd backend/services/analytics-service && npm run dev

# Terminal 4 — Alert & Email Dispatcher
cd backend/services/alert-service && npm run dev
```

#### 3. Run Automated Tests
```bash
cd backend
npm run test:all
```

#### 4. Run Live Traffic Simulator
```bash
cd backend
npm run simulate
```

---

## 🔒 Security & Risk Classifications

| Risk Score | Tier | Action Taken |
| :--- | :--- | :--- |
| **0 – 30** | `LOW` | Automatically approved; baseline record persisted. |
| **31 – 60** | `MEDIUM` | Flagged for asynchronous monitoring. |
| **61 – 100** | `HIGH` | Alert published to Kafka; email sent to security ops. |
| **Manual** | `BLOCKED` | Frozen via analyst console with immediate settlement freeze. |

---

## 📜 License

MIT License © 2026 Aegis Security Inc.
