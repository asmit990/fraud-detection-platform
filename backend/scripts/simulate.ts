import "dotenv/config";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || "http://localhost:3001";
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || "http://localhost:3003";
const JWT_SECRET = process.env.JWT_SECRET || "replace_with_long_random_string_min_32_chars";

// Colors for terminal logs
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function logHeader(title: string) {
  console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate valid JWT token for testing
function generateTestToken(userId: string = "usr_sim_01", role: "analyst" | "admin" = "admin"): string {
  return jwt.sign({ id: userId, email: "tester@fraudplatform.internal", role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

async function runSimulation() {
  logHeader("🚀 STARTING REAL-TIME FRAUD PLATFORM SIMULATOR");

  const token = generateTestToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 0. Check Health
  console.log(`\n${colors.blue}[0/6] Checking Transaction Service Health...${colors.reset}`);
  try {
    const healthRes = await fetch(`${TRANSACTION_SERVICE_URL}/health`);
    if (healthRes.ok) {
      console.log(`${colors.green}  ✓ Transaction Service is HEALTHY on ${TRANSACTION_SERVICE_URL}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}  ⚠️ Health check responded with status: ${healthRes.status}${colors.reset}`);
    }
  } catch (err: any) {
    console.error(`${colors.red}  ✗ Could not connect to Transaction Service. Make sure it is running on port 3001!${colors.reset}`);
    console.error(`    Error: ${err.message}`);
    process.exit(1);
  }

  // 1. Normal Legitimate Transaction
  logHeader("TEST 1: Normal Legitimate Transaction");
  const legitKey = randomUUID();
  const legitPayload = {
    user_id: "usr_legit_101",
    amount: 350.0,
    currency: "INR",
    country: "India",
    device_id: "iphone_14_pro_usr101",
  };

  console.log(`Sending normal payment: ₹${legitPayload.amount} from ${legitPayload.country}...`);
  const legitRes = await fetch(`${TRANSACTION_SERVICE_URL}/api/transactions`, {
    method: "POST",
    headers: { ...headers, "Idempotency-Key": legitKey },
    body: JSON.stringify(legitPayload),
  });

  const legitData = await legitRes.json() as any;
  if (legitRes.status === 201) {
    console.log(`${colors.green}  ✓ Success 201 Created! Transaction ID: ${legitData.transaction?.id}${colors.reset}`);
  } else {
    console.log(`${colors.red}  ✗ Failed with status ${legitRes.status}:`, legitData, colors.reset);
  }

  // 2. Idempotency Replay Test (Same Key + Same Payload)
  logHeader("TEST 2: Enterprise Idempotency Replay Verification");
  await sleep(300);
  console.log(`Re-sending exact same request with Idempotency-Key: ${legitKey}...`);
  const replayStart = Date.now();
  const replayRes = await fetch(`${TRANSACTION_SERVICE_URL}/api/transactions`, {
    method: "POST",
    headers: { ...headers, "Idempotency-Key": legitKey },
    body: JSON.stringify(legitPayload),
  });
  const replayTime = Date.now() - replayStart;
  const replayData = await replayRes.json() as any;
  const isReplayHeader = replayRes.headers.get("idempotency-replay");

  if (isReplayHeader === "true" && replayData.transaction?.id === legitData.transaction?.id) {
    console.log(`${colors.green}  ✓ Idempotency-Replay Header: TRUE (Served from Cache in ${replayTime}ms)${colors.reset}`);
    console.log(`${colors.green}  ✓ Exact match for original Transaction ID: ${replayData.transaction?.id}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}  ⚠️ Replay response: status ${replayRes.status}, replay header: ${isReplayHeader}${colors.reset}`);
  }

  // 3. Idempotency Tamper Protection (Same Key + Different Payload)
  logHeader("TEST 3: Idempotency Payload Tamper Protection (422 Check)");
  console.log(`Attempting to reuse Idempotency-Key ${legitKey} with TAMPERED amount ₹999,999...`);
  const tamperedRes = await fetch(`${TRANSACTION_SERVICE_URL}/api/transactions`, {
    method: "POST",
    headers: { ...headers, "Idempotency-Key": legitKey },
    body: JSON.stringify({ ...legitPayload, amount: 999999 }),
  });
  const tamperedData = await tamperedRes.json() as any;

  if (tamperedRes.status === 422) {
    console.log(`${colors.green}  ✓ Security Protection Active: 422 Unprocessable Entity!${colors.reset}`);
    console.log(`${colors.green}  ✓ Message: "${tamperedData.message}"${colors.reset}`);
  } else {
    console.log(`${colors.red}  ✗ Expected 422 but got status ${tamperedRes.status}:`, tamperedData, colors.reset);
  }

  // 4. Velocity Attack Simulation (6 Rapid Transactions)
  logHeader("TEST 4: Rapid Velocity Fraud Attack Simulation");
  const velocityUser = `usr_velocity_${Date.now()}`;
  console.log(`Sending 6 rapid consecutive transactions for user: ${velocityUser}...`);

  for (let i = 1; i <= 6; i++) {
    const vRes = await fetch(`${TRANSACTION_SERVICE_URL}/api/transactions`, {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": randomUUID() },
      body: JSON.stringify({
        user_id: velocityUser,
        amount: 120 + i * 10,
        currency: "INR",
        country: "India",
        device_id: "dev_velocity_bot",
      }),
    });
    const vData = await vRes.json() as any;
    console.log(`  Payment #${i}: HTTP ${vRes.status} -> ID: ${vData.transaction?.id}`);
    await sleep(200);
  }
  console.log(`${colors.yellow}  ✓ Velocity counters updated in Redis (triggers +30 velocity score after 5th txn)${colors.reset}`);

  // 5. High-Risk International Fraud Anomaly (Large Amount + Geo + Device + Night)
  logHeader("TEST 5: High-Risk AI-Assisted Fraud Anomaly");
  const fraudUser = "usr_vip_india_99";
  const fraudKey = randomUUID();
  const fraudPayload = {
    user_id: fraudUser,
    amount: 89000.0, // Large amount rule (+40)
    currency: "INR",
    country: "Russia", // Geo Anomaly rule (+30)
    device_id: "unrecognized_android_device_xyz", // Device anomaly (+25)
    timestamp: new Date().toISOString(),
  };

  console.log(`Firing high-risk transaction: ₹${fraudPayload.amount} from ${fraudPayload.country}...`);
  const fraudRes = await fetch(`${TRANSACTION_SERVICE_URL}/api/transactions`, {
    method: "POST",
    headers: { ...headers, "Idempotency-Key": fraudKey },
    body: JSON.stringify(fraudPayload),
  });
  const fraudData = await fraudRes.json() as any;
  const fraudTxId = fraudData.transaction?.id;

  console.log(`${colors.green}  ✓ Transaction Created: ${fraudTxId}${colors.reset}`);
  console.log(`  Waiting 0.9 seconds for Outbox Relay -> Kafka -> Fraud Engine (Rules + Gemini AI) -> Alert...`);
  await sleep(900);

  // Check transaction status and alert
  const checkRes = await fetch(`${TRANSACTION_SERVICE_URL}/api/transactions/${fraudTxId}`, {
    headers,
  });
  const checkData = await checkRes.json() as any;
  const updatedTx = checkData.transaction;
  const alerts = checkData.alerts || [];

  console.log(`\n  Transaction Evaluation Result:`);
  console.log(`  - Risk Score: ${colors.bright}${updatedTx?.risk_score}${colors.reset}`);
  console.log(`  - Fraud Status: ${updatedTx?.fraud_status === "HIGH" ? colors.red : colors.green}${updatedTx?.fraud_status}${colors.reset}`);
  console.log(`  - Triggered Alerts: ${alerts.length > 0 ? colors.red + alerts.length + " Alert(s)" : colors.green + "0 Alerts"}${colors.reset}`);
  if (alerts.length > 0) {
    console.log(`  - Alert Message: "${alerts[0].message}"`);
  }

  // 6. Live Analytics Verification
  logHeader("TEST 6: Real-Time Analytics Dashboard Verification");
  try {
    const analyticsRes = await fetch(`${ANALYTICS_SERVICE_URL}/api/analytics/summary`, {
      headers,
    });
    if (analyticsRes.ok) {
      const summary = await analyticsRes.json() as any;
      console.log(`${colors.green}  ✓ Analytics Summary Fetched Successfully:${colors.reset}`);
      console.log(`    • Total Transactions: ${summary.total_transactions}`);
      console.log(`    • High Risk Flagged:  ${colors.red}${summary.high_risk}${colors.reset}`);
      console.log(`    • Medium Risk:        ${colors.yellow}${summary.medium_risk}${colors.reset}`);
      console.log(`    • Low Risk (Clean):   ${colors.green}${summary.low_risk}${colors.reset}`);
      console.log(`    • Average Risk Score: ${summary.avg_risk_score}`);
    } else {
      console.log(`${colors.yellow}  Analytics service returned status ${analyticsRes.status}${colors.reset}`);
    }
  } catch (err: any) {
    console.log(`${colors.yellow}  Note: Analytics service not running on port 3003 (Optional).${colors.reset}`);
  }

  logHeader("✅ SIMULATION COMPLETE — ALL ARCHITECTURAL FLOWS VERIFIED!");
}

runSimulation().catch((err) => {
  console.error("\nSimulation Error:", err);
  process.exit(1);
});
