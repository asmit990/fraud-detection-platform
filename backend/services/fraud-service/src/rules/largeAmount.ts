import { Transaction } from "../types";

export default async function largeAmountRule(
  transaction: Transaction
): Promise<number> {

  if (transaction.amount > 10000) {
    return 40;
  }

  return 0;
}