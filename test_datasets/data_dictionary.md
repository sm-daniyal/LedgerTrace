# LedgerTrace Data Dictionary & Evaluation Schema

This document details the exact field-level schema, data types, constraints, and business logic for all three reconciliation streams supported by LedgerTrace.

---

## 1. Merchant Order Stream (`merchant_orders_august.csv`)
Represents the internal Order Management System (OMS) or merchant enterprise database.

| Field Name | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `order_id` | String | Primary Key | Unique internal merchant order identifier (e.g. `ORD_9001`). |
| `customer_id` | String | Required | Merchant customer identifier (e.g. `CUST_A101`). |
| `amount` | Decimal(10,2) | $> 0.00$ | Total invoice gross order value charged to customer in INR. |
| `currency` | String | ISO 4217 | Transaction currency (`INR`). |
| `status` | Enum | `SUCCESS`, `PENDING`, `FAILED` | Merchant order status. Dropped 504 webhooks leave valid captured orders stuck in `PENDING`. |
| `payment_method` | Enum | `UPI`, `CREDIT_CARD`, `DEBIT_CARD`, `NET_BANKING` | Payment rail selected by customer. Used to lookup contracted MDR rate card. |
| `card_network` | Enum (Nullable) | `VISA`, `MASTERCARD`, `AMEX` | Card network issuer. Used for rate variance and surcharge detection. |
| `created_at` | Timestamp | ISO 8601 | Order creation timestamp (`YYYY-MM-DD HH:MM:SS`). |

---

## 2. Gateway Settlement MIS Stream (`gateway_settlement_mis_august.csv`)
Represents the raw merchant settlement export from payment aggregators (Razorpay, Stripe, PayU).

| Field Name | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `gateway_payment_id` | String | Primary Key | Aggregator transaction reference (e.g. `pay_9001`). |
| `order_id` | String | Foreign Key | Merchant order reference linking gateway record to merchant OMS. |
| `gross_amount` | Decimal(10,2) | $> 0.00$ | Gross transaction amount captured by payment gateway. |
| `fee` | Decimal(10,2) | $\ge 0.00$ | Merchant Discount Rate (MDR) fee deducted by aggregator. |
| `tax` | Decimal(10,2) | $\ge 0.00$ | 18% Goods & Services Tax (GST) charged on MDR fee. |
| `net_amount` | Decimal(10,2) | $> 0.00$ | Net settlement amount payable to merchant: `gross - (fee + tax)`. |
| `status` | Enum | `captured`, `failed`, `refunded` | Gateway transaction lifecycle state. |
| `settlement_id` | String (Nullable) | Foreign Key | Batch settlement group identifier (e.g. `SETTL_AUG_BATCH_01`). |
| `created_at` | Timestamp | ISO 8601 | Payment capture timestamp. |
| `settled_at` | Timestamp (Nullable)| ISO 8601 | Aggregator batch settlement clearing timestamp. |

---

## 3. Bank Statement Credit Feed (`bank_statement_august.csv`)
Represents the corporate current bank account statement (HDFC, ICICI, SBI) with lumped NEFT/RTGS credits.

| Field Name | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `bank_ref_no` | String | Primary Key | Unique Bank Reference Number / UTR (`UTR_HDFC_AUG_991`). |
| `settlement_id` | String | Foreign Key | Aggregator settlement batch identifier matching gateway batch. |
| `credit_amount` | Decimal(10,2) | $> 0.00$ | Net consolidated batch deposit credited to corporate bank account. |
| `transaction_date` | Date | `YYYY-MM-DD` | Date funds credited to corporate bank account. |
| `narration` | String | Required | Bank transaction narration string (e.g. `NEFT-RAZORPAY-SETTL_AUG_BATCH_01`). |

---

## 4. Contract Rate Card Baseline (`contracts.json`)
Authoritative commercial rate agreement against which all MDR fee invariant calculations are bounded.

| Payment Method | Card Network | Contracted MDR Rate | Statutory GST Rate | Invariant Rule |
| :--- | :--- | :---: | :---: | :--- |
| **UPI** | All | **0.00%** | 0.00% | Zero MDR fee mandated by regulatory policy |
| **Debit Card** | Visa / Mastercard | **0.90%** | 18.00% | $\text{Fee} = \text{round}(\text{Gross} \times 0.009, 2)$ |
| **Credit Card** | Visa / Mastercard | **1.80%** | 18.00% | $\text{Fee} = \text{round}(\text{Gross} \times 0.018, 2)$ |
| **Credit Card** | Amex | **1.80%** | 18.00% | Standard contracted baseline (unauthorized surcharge if $> 1.8\%$) |
| **Net Banking** | Top Banks | **1.50%** | 18.00% | $\text{Fee} = \text{round}(\text{Gross} \times 0.015, 2)$ |
