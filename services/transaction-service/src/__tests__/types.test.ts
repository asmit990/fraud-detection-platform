import type { Transaction, Alert, CreateTransactionBody } from '../types';

describe('Transaction type shape', () => {
  it('accepts a valid Transaction object', () => {
    const tx: Transaction = {
      id: 'abc-123',
      user_id: 'user-1',
      amount: 250.0,
      currency: 'USD',
      country: 'US',
      device_id: 'device-42',
      timestamp: new Date(),
      risk_score: 0.1,
      fraud_status: 'PENDING',
      created_at: new Date(),
    };
    expect(tx.fraud_status).toBe('PENDING');
    expect(tx.amount).toBeGreaterThan(0);
  });

  it('accepts a valid Alert object', () => {
    const alert: Alert = {
      id: 'alert-1',
      transaction_id: 'abc-123',
      severity: 'HIGH',
      message: 'Suspicious transaction detected',
      created_at: new Date(),
    };
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(alert.severity);
  });

  it('accepts a valid CreateTransactionBody', () => {
    const body: CreateTransactionBody = {
      user_id: 'user-1',
      amount: 100,
      country: 'US',
      device_id: 'device-1',
    };
    expect(body.currency).toBeUndefined();
    expect(body.amount).toBe(100);
  });
});
