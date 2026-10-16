# LedgerTrace System Architecture & Technical Specifications

## 1. Problem Definition & Operational Context
Modern payment aggregators and high-volume digital merchants process millions of transactions across distributed banking rails, card networks, and UPI switches. In this landscape, financial reconciliation often fails due to five fundamental operational bottlenecks:
1. Net vs. Gross Payout Discrepancies: Gateway payouts arrive as single aggregated bank deposits after deducting variable MDR fees, GST, chargebacks, and rolling reserves.
2. Unannounced MDR & Tax Leakage: Aggregators occasionally charge non-standard surcharges on specific payment instruments (e.g. corporate or international cards) exceeding contracted rates.
3. Dropped Webhook Status Drift: Network timeouts (HTTP 504) or premature browser tab terminations leave merchant databases in a 'PENDING' state despite successful gateway capture and bank credit.
4. Settlement SLA Breaches (T+1 / T+2): Inability to proactively predict floating liquidity delays and evaluate downstream operational impact on vendor disbursements.
5. Incompatible Bank Statement Formats: Distinct formats, date encodings, and narration structures across financial institutions.

---

## 2. Multi-Tier System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                      LEDGERTRACE ARCHITECTURE                                      |
+---------------------------------------------------------------------------------------------------+

   [ 1. Ingestion Layer ]        [ 2. Deterministic Matching ]       [ 3. Agentic Forensic Layer ]
   - Merchant Order DB (CSV/JSON) ---> - Exact UTR Matcher        ---> - Automated Investigation DAG
   - Gateway Settlement MIS       ---> - Fuzzy Reference Matcher  ---> - Downstream Impact Analysis
   - Bank Statement (CSV)         ---> - MDR/GST Math Verifier    ---> - Active Governance Alerts
                                               |                                   |
                                               v                                   v
                                 [ 4. Financial Lineage Graph ]      [ 5. Self-Healing Action Hub ]
                                 - Interactive Node Graph (DAG)      - 1-Click Journal Adjustments
                                 - Node Status & Provenance          - Dropped Webhook Resync
                                 - Net/Gross Batch Breakdown         - Dispute Packet Exporter
                                               |                                   |
                                               +-----------------+-----------------+
                                                                 |
                                                                 v
                                                  [ 6. High-Polish Control Canvas ]
                                                  - Clean Slate/Dark Interface
                                                  - Interactive Node Lineage Viewer
                                                  - Live Agent Reasoning Traces
                                                  - Global Command Palette (Ctrl+K)
```

---

## 3. Core Engine Components

### 3.1 Ingestion & Normalization Layer (`app.engine.ingester`)
- Ingests raw merchant database exports, gateway settlement MIS files, and bank statement feeds.
- Normalizes column naming variants (e.g., 'utr' vs 'bank_ref_no', 'payment_id' vs 'gateway_payment_id').
- Extracts structured financial records with zero data truncation.

### 3.2 Strict Mathematical Calculators (`app.engine.calculators`)
- Performs deterministic floating-point financial calculations with 2-decimal invariant guarantees:
  * Expected Fee = round((Gross Amount * Contracted Rate) / 100, 2)
  * Expected GST = round(Expected Fee * 0.18, 2)
  * Expected Net Settlement = round(Gross Amount - (Expected Fee + Expected GST), 2)
- Compares charged fees against rate cards to detect exact monetary leakage.

### 3.3 3-Way Reconciliation Matcher (`app.engine.matcher`)
- Matches merchant order records with gateway capture logs and settlement batches.
- Reconciles individual transactions against aggregate bank deposit UTRs.
- Categorizes discrepancies into actionable classes: `MDR_OVERCHARGE`, `DROPPED_WEBHOOK`, `SETTLEMENT_DELAY`, `MISSING_GATEWAY_RECORD`.

### 3.4 Transaction Financial Lineage Engine (`app.engine.lineage_builder`)
- Constructs an end-to-end directed acyclic graph (DAG) representing the complete provenance of every rupee.
- Links each transaction across four sequential nodes:
  `Order Node -> Gateway Node -> Payout Batch Node -> Bank UTR Node`.

### 3.5 Autonomous Forensic Agent Layer (`app.agents.investigator`)
- Evaluates the root cause of every detected discrepancy.
- Simulates external API checks, webhook delivery inspection, and contracted fee validation.
- Computes downstream operational risk (e.g., impact on scheduled vendor payouts).

### 3.6 Self-Healing & Action Engine (`app.agents.healing`)
- Generates compliant double-entry balancing journal vouchers for ERP ingestion.
- Triggers synthetic webhook resync events for orphan transactions.
- Exports structured dispute claim packets for gateway operations teams.

---

## 4. Verification & Invariant Guarantees
- Zero LLM math hallucinations: All financial formulas are computed in deterministic Python functions.
- Auditability: Every resolution action produces a timestamped voucher or dossier with complete lineage provenance.
