import "dotenv/config";   
import * as nodemailer from "nodemailer";
import { Alertmessage } from "../types";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


export async function sendFraudEmail(alert: Alertmessage): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: " Fraud Alert - High Risk Transaction Detected",
      html: `
        <h2> Fraud Alert</h2>
        <p><strong>User ID:</strong> ${alert.user_id}</p>
        <p><strong>Amount:</strong> ${alert.amount}</p>
        <p><strong>Country:</strong> ${alert.country}</p>
        <p><strong>Risk Score:</strong> ${alert.risk_score}</p>
        <p><strong>Reasons:</strong> ${Array.isArray(alert.reasons) ? alert.reasons.join(", ") : alert.reasons}</p>
        <p><strong>Transaction ID:</strong> ${alert.transaction_id}</p>
      `,
    });

    console.log(`Email sent for transaction ${alert.transaction_id}`);
  } catch (error) {
    console.error("Email failed:", error);
  }
}