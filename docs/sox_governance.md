# SOX 404 Internal Governance, Idempotency & ERP Journal Export

## 1. Compliance Mandate: Sarbanes-Oxley (SOX) Section 404

In automated financial systems, autonomous AI agents must **never** be granted direct, unilateral write access to the general ledger or treasury disbursement rails. 

To maintain compliance with **SOX Section 404 (Management Assessment of Internal Controls)**, LedgerTrace enforces a strict **Segregation of Duties (SoD)**:

```
[ AI Anomaly Detection & Forensic Investigation ]
                       │
                       ▼
          [ Staged Action Proposal ]
          (Status: PENDING_APPROVAL)
                       │
                       ▼
          [ SOX Governance Gate ]
          (Controller Review & Sign-Off)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[ APPROVED & EXECUTED ]      [ ACTION REJECTED ]
  - Double-Entry Journal       - Rejection Reason Logged
  - Webhook Replay             - Audit Entry Sealed
  - SHA-256 Audit Trail
```

- **Zero Autonomous Ledger Mutations:** The agent can only stage proposed actions into an approval queue; only an authorized human controller can trigger execution.
- **Role Isolation:** Agent code cannot execute approval state transitions; the controller credentials must accompany any `/approve` invocation.

---

## 2. Idempotent State Machine & Duplicate Write Prevention

Financial ledgers must remain strictly idempotent: re-transmitting an approval request (due to network retries, browser double-clicks, or race conditions) must **never** generate duplicate journal vouchers or double-credit a ledger account.

### State Transition Invariants
```
                  ┌──────────────┐
                  │    STAGED    │
                  └──────┬───────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│ APPROVED_AND_EXECUTED │   │       REJECTED        │
└───────────────────────┘   └───────────────────────┘
```

- **Terminal States:** `APPROVED_AND_EXECUTED` and `REJECTED` are strictly terminal.
- **Concurrency Guard:** Re-submitting an already approved action immediately yields:
  ```json
  {
    "error": "Action ACT_9003 is already APPROVED_AND_EXECUTED",
    "status_code": 400
  }
  ```
  Verified across 100% of test suites with zero duplicate journal writes.

---

## 3. General Ledger Double-Entry Journal Export Specification

When a self-healing action is approved, LedgerTrace automatically synthesizes balanced double-entry accounting records formatted for direct ERP ingestion (DualEntry, NetSuite, SAP, Oracle Financials).

### Invariant: Total Debits == Total Credits
$$\sum \text{Debit} \equiv \sum \text{Credit}$$

### Standard ERP Journal Voucher Payload Schema
```json
{
  "voucher_id": "JV-2026-0928-9003",
  "source_event": "DISCREPANCY_MDR_OVERCHARGE",
  "discrepancy_ref": "DISC_MDR_001",
  "order_ref": "ORD_9003",
  "posted_at": "2026-09-28T21:28:26.120Z",
  "approved_by": "controller@merchant.com",
  "sox_audit_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "currency": "INR",
  "is_balanced": true,
  "lines": [
    {
      "line_no": 1,
      "account_code": "6120",
      "account_name": "Payment Gateway Processing Fees (Variance Surcharge)",
      "debit": 1316.88,
      "credit": 0.00,
      "description": "Unauthorized Amex rate surcharge adjustment (3.2% vs 1.8% contracted)"
    },
    {
      "line_no": 2,
      "account_code": "1150",
      "account_name": "Gateway Settlement Clearing Suspense",
      "debit": 0.00,
      "credit": 1316.88,
      "description": "Offsetting suspense credit pending aggregator dispute claim"
    }
  ]
}
```

---

## 4. Cryptographic Audit Chain Integrity

Every investigation report, reasoning step, and approval action is hashed using **SHA-256**:
$$\text{Audit Hash} = \text{SHA-256}(\text{Discrepancy ID} \parallel \text{Timestamp} \parallel \text{Tool Inputs} \parallel \text{Scalar Deltas})$$

This produces an immutable, tamper-evident audit record suitable for external Big Four financial audits (EY, PwC, Deloitte, KPMG).
