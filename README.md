# Real-Time Fraud Detection Platform

A production-grade, event-driven fraud detection system built with TypeScript microservices. Detects fraudulent transactions in milliseconds using a combination of rule-based scoring and Google Gemini AI.

---

## What This Does

Every time a transaction comes in, the system:

1. Receives and validates it via REST API
2. Publishes it to a Kafka event stream
3. Runs 5 fraud detection rules in parallel
4. Calls Gemini AI for an additional ML-based fraud probability
5. Combines rule score + AI score into a final risk score
6. Classifies it as LOW / MEDIUM / HIGH risk
7. Updates the database with the result
8. Fires an email alert if the transaction is HIGH risk
9. Makes all stats available via analytics APIs

All of this happens in real time, under 500ms.

---

## System Architecture

```
CLIENT / POSTMAN
      │
      │ HTTP POST /api/transactions
      ▼
┌──────────────────────────┐
│   TRANSACTION SERVICE    │  port 3001
│   Node.js + Express      │
│                          │
│   validates payload      │
│   saves to postgres      │
│   publishes to kafka     │
└────────────┬─────────────┘
             │
             │ publishes to topic: "transactions"
             ▼
┌──────────────────────────┐
│         KAFKA            │
│                          │
│   topic: transactions    │
│   topic: alerts          │
└────────────┬─────────────┘
             │
             │ consumed by fraud-service
             ▼
┌──────────────────────────┐     ┌─────────────────────┐
│     FRAUD SERVICE        │     │       REDIS          │
│     Node.js              │◄───►│                     │
│                          │     │  velocity counter   │
│  runs 5 rules:           │     │  geo history        │
│  ┌────────────────────┐  │     │  device history     │
│  │ large amount  +40  │  │     └─────────────────────┘
│  │ velocity      +30  │  │
│  │ geo anomaly   +30  │  │     ┌─────────────────────┐
│  │ new device    +25  │  │◄───►│    GEMINI AI API    │
│  │ night 1-5am   +20  │  │     │    (free tier)      │
│  └────────────────────┘  │     │                     │
│                          │     │  returns:           │
│  final score =           │     │  fraud_probability  │
│  rules × 0.4             │     │  + reason           │
│  + ML × 0.6              │     └─────────────────────┘
│                          │
│  0-30  → LOW             │────► updates POSTGRES
│  31-60 → MEDIUM          │      risk_score
│  61+   → HIGH            │      fraud_status
└────────────┬─────────────┘
             │
             │ if HIGH → publishes to topic: "alerts"
             ▼
┌──────────────────────────┐
│      ALERT SERVICE       │
│      Node.js             │
│                          │
│   consumes alerts topic  │
│   sends email via Gmail  │
│   nodemailer + SMTP      │
└──────────────────────────┘


┌──────────────────────────┐
│    ANALYTICS SERVICE     │  port 3003
│    Node.js + Express     │
│                          │
│  GET /summary            │──► total txns, fraud count,
│  GET /trends             │    avg risk score
│  GET /countries          │──► fraud per day (7 days)
└──────────────────────────┘──► fraud by country
```

---

## Data Flow Step by Step

```
Step 1   Client sends POST /api/transactions
         { user_id, amount, country, device_id }

Step 2   transaction-service validates the body
         rejects if amount <= 0 or missing fields
         saves to postgres as fraud_status: PENDING

Step 3   transaction-service publishes to kafka
         topic: "transactions"

Step 4   fraud-service consumes the message
         runs all 5 rules in parallel using Promise.all()

Step 5   Redis checks:
           velocity  → how many txns from this user in 10 mins?
           geo       → what country did this user use last time?
           device    → has this device been seen before?

Step 6   Gemini AI called with transaction details
         returns { fraud_probability: 0.87, reason: "..." }

Step 7   scores combined:
           rule_score × 0.4 + ml_score × 0.6 = final_score

Step 8   postgres updated:
           risk_score = final_score
           fraud_status = LOW / MEDIUM / HIGH

Step 9   if HIGH:
           alert saved to postgres alerts table
           event published to kafka topic: "alerts"

Step 10  alert-service consumes from "alerts" topic
         sends email to fraud team via Gmail SMTP

Step 11  analytics-service reads postgres
         returns aggregated stats via REST APIs
```

---

## Fraud Detection Rules Explained

```
Rule 1 — Large Amount (+40 points)
  if transaction.amount > 10,000
  highest weight rule
  large transactions are inherently more suspicious

Rule 2 — Velocity (+30 points)
  if user makes more than 5 transactions in 10 minutes
  tracked in Redis with auto-expiring counter
  resets every 10 minutes automatically

Rule 3 — Geo Anomaly (+30 points)
  if transaction country != user's last known country
  last country stored in Redis per user
  "user was in India, now buying from Russia"

Rule 4 — Device Anomaly (+25 points)
  if device_id has never been seen before for this user
  known devices stored in Redis as a set per user
  new device = possible account takeover

Rule 5 — Night Activity (+20 points)
  if transaction happens between 1am and 5am
  unusual hours = higher fraud probability

Gemini AI (weighted at 60%)
  sends transaction details to Gemini API
  receives fraud_probability between 0.0 and 1.0
  converted to 0-100 scale
  combined with rule score:
    final = (rule_score × 0.4) + (ml_score × 0.6)
```

---

## Risk Classification

```
Score 0  - 30   →   LOW      normal transaction
Score 31 - 60   →   MEDIUM   worth watching
Score 61 - 100  →   HIGH     alert fired, email sent
```

---

## Services Breakdown

```
┌─────────────────────────────────────────────────────┐
│ transaction-service          port 3001              │
│                                                     │
│ the entry point of the system                       │
│ accepts transactions via REST API                   │
│ validates and saves to postgres                     │
│ publishes events to kafka                           │
│ no fraud logic here, just receive and forward       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ fraud-service                port 3002 (internal)   │
│                                                     │
│ the brain of the system                             │
│ no REST API, only listens to kafka                  │
│ runs all 5 rules in parallel                        │
│ calls gemini AI                                     │
│ calculates final score                              │
│ updates postgres                                    │
│ fires alert if HIGH risk                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ alert-service                no port (event driven) │
│                                                     │
│ listens to kafka "alerts" topic                     │
│ when message arrives → sends email                  │
│ uses nodemailer + Gmail SMTP                        │
│ email contains full transaction details             │
│ never crashes even if email fails                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ analytics-service            port 3003              │
│                                                     │
│ read-only service, never writes to DB               │
│ queries postgres for aggregated stats               │
│ powers dashboard charts                             │
│ GET /summary  → totals and averages                 │
│ GET /trends   → fraud per day (last 7 days)         │
│ GET /countries → fraud by country (top 10)          │
└─────────────────────────────────────────────────────┘
```

---

## Why Each Technology Was Chosen

```
Kafka (not direct HTTP calls)
  if fraud-service goes down, messages wait in queue
  no transactions lost
  services are completely decoupled
  easy to add more consumers later

Redis (not postgres for checks)
  velocity check needs to be done in microseconds
  postgres queries are too slow for real-time checks
  Redis TTL auto-expires velocity counters after 10 mins
  no manual cleanup needed

Gemini AI (not custom ML model)
  free tier is generous enough for dev + demo
  no training data needed
  no model hosting needed
  gives explanation with score (explainability)
  fallback to rule score if API is down

TypeScript (not plain JavaScript)
  catches type errors at compile time
  Transaction interface ensures all services
  agree on the shape of data
  much safer for financial systems

Docker Compose
  one command starts everything
  postgres, redis, kafka all local
  no manual installation
  same environment on every machine
```

---

## Project Structure

```
fraud-platform/
│
├── docker-compose.yml          starts all infrastructure
├── init.sql                    creates tables on first run
│
└── services/
    │
    ├── transaction-service/
    │   └── src/
    │       ├── index.ts                server startup
    │       ├── db.ts                   postgres connection
    │       ├── kafka.ts                kafka producer
    │       ├── types.ts                TypeScript interfaces
    │       ├── controller/
    │       │   └── transaction.controller.ts
    │       └── routes/
    │           └── transaction.routes.ts
    │
    ├── fraud-service/
    │   └── src/
    │       ├── index.ts                server startup + kafka consumer
    │       ├── db.ts                   postgres connection
    │       ├── kafka.ts                kafka consumer
    │       ├── redis.ts                redis connection
    │       ├── types.ts                TypeScript interfaces
    │       ├── engine/
    │       │   └── fraudEngine.ts      orchestrates all rules + AI
    │       ├── rules/
    │       │   ├── largeAmount.ts      +40 if amount > 10k
    │       │   ├── velocity.ts         +30 if >5 txns/10min
    │       │   ├── geoAnomaly.ts       +30 if new country
    │       │   ├── deviceAnomaly.ts    +25 if new device
    │       │   └── nightActivity.ts    +20 if 1am-5am
    │       └── services/
    │           ├── geminiService.ts    calls Gemini API
    │           └── alertService.ts     saves alert to postgres
    │
    ├── analytics-service/
    │   └── src/
    │       ├── index.ts
    │       ├── types.ts
    │       ├── database/
    │       │   └── db.ts
    │       ├── controllers/
    │       │   └── analytics.controller.ts
    │       └── routes/
    │           └── analytics.routes.ts
    │
    └── alert-service/
        └── src/
            ├── index.ts
            ├── kafka.ts
            ├── types.ts
            └── services/
                ├── emailService.ts     nodemailer setup
                └── alertHandler.ts     parses + calls email
```

---

## Getting Started

### Prerequisites

```
Docker Desktop   → docker.com/products/docker-desktop
Node.js v20+     → nodejs.org
Git              → git-scm.com
Postman          → postman.com (for testing)
```

### Step 1 — Clone and Start Infrastructure

```bash
git clone https://github.com/asmit990/fraud-detection-platform.git
cd fraud-platform
docker-compose up -d
docker ps
```

You should see 5 containers running:
```
fraud_postgres    → Up
fraud_redis       → Up
fraud_zookeeper   → Up
fraud_kafka       → Up
fraud_kafka_ui    → Up
```

Open Kafka UI at `http://localhost:8080`

### Step 2 — Environment Variables

Create `.env` inside each service folder.

**transaction-service/.env**
```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=fraud_user
DB_PASSWORD=fraud_pass
DB_NAME=fraud_db
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=transaction-service
KAFKA_TOPIC=transactions
```

**fraud-service/.env**
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=fraud_user
DB_PASSWORD=fraud_pass
DB_NAME=fraud_db
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=fraud-service
KAFKA_TOPIC=transactions
KAFKA_GROUP_ID=fraud-service-group
GEMINI_API_KEY=your_key_here
```

**analytics-service/.env**
```
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_USER=fraud_user
DB_PASSWORD=fraud_pass
DB_NAME=fraud_db
```

**alert-service/.env**
```
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=alert-service
KAFKA_TOPIC=alerts
KAFKA_GROUP_ID=alert-service-group
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_TO=alerts@yourcompany.com
```

### Step 3 — Start All Services

Open 4 terminals:

```bash
# terminal 1
cd services/transaction-service && npm install && npm run dev

# terminal 2
cd services/fraud-service && npm install && npm run dev

# terminal 3
cd services/analytics-service && npm install && npm run dev

# terminal 4
cd services/alert-service && npm install && npm run dev
```

### Step 4 — Test

```bash
# send a high risk transaction
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "amount": 95000,
    "currency": "INR",
    "country": "Russia",
    "device_id": "device_new_xyz"
  }'
```

Watch fraud-service terminal:
```
Processing transaction: uuid
Gemini score: 0.91 → high value international transfer
Transaction uuid → score: 88 → HIGH
Reasons: large amount, geo anomaly, unknown device, ML: high value international transfer
Alert created for transaction uuid
Email sent for transaction uuid
```

---

## API Reference

### Transaction Service — localhost:3001

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | health check |
| POST | /api/transactions | submit new transaction |
| GET | /api/transactions | list all transactions |
| GET | /api/transactions/:id | get transaction + alerts |
| GET | /api/transactions?user_id=x | filter by user |
| GET | /api/transactions?fraud_status=HIGH | filter by status |
| GET | /api/transactions?limit=10&offset=0 | pagination |

### POST /api/transactions — Request Body

```json
{
  "user_id": "user_001",
  "amount": 95000,
  "currency": "INR",
  "country": "Russia",
  "device_id": "device_xyz"
}
```

### Analytics Service — localhost:3003

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/summary | totals + averages |
| GET | /api/analytics/trends | fraud per day last 7 days |
| GET | /api/analytics/countries | top fraud countries |

### GET /api/analytics/summary — Response

```json
{
  "total_transactions": "1500",
  "high_risk": "89",
  "medium_risk": "145",
  "low_risk": "1266",
  "avg_risk_score": "34.50",
  "total_alerts": "89"
}
```

---

## Getting Free API Keys

### Gemini AI (for fraud-service)
```
1. go to aistudio.google.com
2. sign in with Google account
3. click Get API Key → Create API Key
4. copy key → paste in fraud-service .env as GEMINI_API_KEY
free tier: 15 requests/min, 1M tokens/day
```

### Gmail App Password (for alert-service)
```
1. go to myaccount.google.com
2. Security → 2-Step Verification → enable it
3. Security → App Passwords → create new
4. name it "fraud-platform"
5. copy 16 character password (remove spaces)
6. paste in alert-service .env as EMAIL_PASS
```

---

## Infrastructure

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| fraud_postgres | postgres:15 | 5432 | main database |
| fraud_redis | redis:7-alpine | 6379 | velocity + geo + device cache |
| fraud_kafka | confluentinc/cp-kafka:7.4.0 | 9092 | message queue |
| fraud_zookeeper | confluentinc/cp-zookeeper:7.4.0 | 2181 | kafka dependency |
| fraud_kafka_ui | provectuslabs/kafka-ui | 8080 | visual kafka dashboard |

---

## What Makes This Production-Grade

```
✓ event driven architecture
  services don't call each other directly
  kafka decouples everything
  one service down = no data lost

✓ non-blocking design
  kafka failure doesn't block HTTP response
  email failure doesn't crash alert-service
  gemini failure falls back to rule score only

✓ parallel rule execution
  all 5 rules run simultaneously via Promise.all()
  not sequential, much faster

✓ Redis for real-time checks
  velocity checks in microseconds
  auto-expiring keys, no cleanup needed

✓ TypeScript throughout
  compile-time type safety
  Transaction interface shared across services
  no runtime type surprises

✓ graceful startup
  process.exit(1) if any service fails to start
  never runs in a broken state
```

---

## Real World Use Cases

This exact architecture is used by:

```
Stripe     → payment fraud detection
Razorpay   → UPI and card fraud
PhonePe    → transaction monitoring
PayPal     → account takeover detection
Banks      → that SMS "suspicious activity detected"
           is literally this system running
```

---
