# 📂 LedgerTrace Evaluation Test Datasets

This directory contains realistic sample financial feeds for evaluating LedgerTrace's 3-way reconciliation, anomaly detection, and autonomous forensic agents.

---

## 📊 Dataset Files:

1. **`merchant_orders_august.csv`**
   * **Source:** Merchant Internal Order Management System (OMS / ERP).
   * **Contents:** 8 transactions across UPI, Credit Cards (Visa, Amex, Mastercard), Debit Cards, and Net Banking.
   * **Key Edge Case:** `ORD_9005` is marked as `PENDING` due to a dropped webhook, while payment was captured at the gateway.

2. **`gateway_settlement_mis_august.csv`**
   * **Source:** Payment Aggregator Settlement Report (Razorpay / Stripe MIS).
   * **Contents:** Transaction-level gross amounts, MDR fees, 18% GST deductions, net settlement payouts, and batch IDs.
   * **Key Edge Case:** `ORD_9003` was charged an unauthorized 3.20% Amex fee surcharge against a 1.80% contracted rate baseline (generating a fee variance of INR 868.00).

3. **`bank_statement_august.csv`**
   * **Source:** Corporate Bank Statement (HDFC Bank Account).
   * **Contents:** Consolidated settlement batch deposits credited via NEFT with UTR numbers (`SETTL_AUG_BATCH_01` & `SETTL_AUG_BATCH_02`).

---

## 🚀 How to Test in the Dashboard:
1. Open the LedgerTrace dashboard at `http://localhost:5173`.
2. Click **`Import CSV Feeds`** in the top navigation bar.
3. Select the 3 corresponding CSV files from this folder.
4. Click **`Execute 3-Way Reconciliation`** to run the matching engine and forensic agents!
