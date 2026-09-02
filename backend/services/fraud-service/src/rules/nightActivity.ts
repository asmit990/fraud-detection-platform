import { Transaction } from "../types";

export function nightActivityRule(transaction: Transaction): number {
  const hour = new Date(transaction.timestamp).getHours();
  return hour >= 1 && hour <= 5 ? 20 : 0;
}