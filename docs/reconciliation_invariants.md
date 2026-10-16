# Mathematical Specification: Multi-Feed Reconciliation & Fee Invariants

## 1. Multi-Stream Set Reconciliation Formulation

In high-volume payment processing, financial transactions are observed across three asynchronous data streams:
1. **Merchant Order Book ($O$):** Internal database records generated at order checkout:
   $$O_i = \{ \text{order\_id}, \text{customer\_id}, \text{gross\_amount}, \text{timestamp}, \text{status} \}$$
2. **Payment Gateway Settlement Feed ($G$):** Settlement records reported by acquiring aggregators (Razorpay, Stripe, PayU):
   $$G_j = \{ \text{gateway\_payment\_id}, \text{order\_id}, \text{captured\_amount}, \text{fee}, \text{tax}, \text{net\_settlement}, \text{method} \}$$
3. **Bank Electronic Statement / UTR ($B$):** Actual treasury cash credits received in merchant bank clearing accounts:
   $$B_k = \{ \text{utr\_number}, \text{settlement\_ref}, \text{credited\_amount}, \text{credit\_timestamp} \}$$

### Deterministic Matching Cardinality
A transaction is classified as **Fully Reconciled** if and only if the exact bijective mapping exists:
$$\mathcal{M}(O_i, G_j, B_k) \iff (O_i.\text{order\_id} = G_j.\text{order\_id}) \land (G_j.\text{settlement\_id} = B_k.\text{settlement\_ref}) \land (|O_i.\text{gross\_amount} - G_j.\text{captured\_amount}| = 0.00)$$

Transactions failing this mapping are partitioned into deterministic exception sets:
- **Orphan Merchant Order:** $O_i \in O \land O_i \notin G$ (Dropped webhook or checkout abandoned)
- **Unsettled Gateway Capture:** $G_j \in G \land G_j \notin B$ (Settlement float delay or gateway liquidity hold)
- **Unattributed Bank Credit:** $B_k \in B \land B_k \notin G$ (Unmatched direct bank deposit)

---

## 2. MDR Fee & GST Invariant Equations

The fundamental mathematical invariant governing payment gateway settlement is:
$$\text{Net Settlement} \equiv \text{Gross Captured Amount} - \text{MDR Fee} - \text{GST}$$

### Contracted Rate Card Model
Aggregator contracts define Merchant Discount Rates ($\text{MDR}_{\text{rate}}$) strictly by payment instrument:
- **UPI (Unified Payments Interface):** $0.00\%$
- **Debit Card (RuPay / Domestic):** $0.90\%$
- **Credit Card (Standard Visa / Mastercard):** $1.80\%$
- **Corporate / Amex Cards:** $1.80\%$ (Contracted baseline)
- **Net Banking (Tier-1 Banks):** $1.50\%$

### GST Surcharge Invariant
Under Indian Goods and Services Tax (GST) regulations, financial intermediation services attract an 18.00% tax on the fee component:
$$\text{GST} = \text{round}_{2}\left( \text{MDR Fee} \times 0.18 \right)$$
$$\text{Total Deducted} = \text{MDR Fee} + \text{GST} = \text{round}_{2}\left( \text{Gross} \times \text{MDR}_{\text{rate}} \times 1.18 \right)$$

### Fee Invariant Verification Algorithm
$$\Delta_{\text{fee}} = |\text{Net}_{\text{actual}} - (\text{Gross} - \text{Total Deducted})|$$
$$\text{Status} = \begin{cases} \text{BALANCED}, & \Delta_{\text{fee}} \le 0.01 \\ \text{MDR\_OVERCHARGE}, & \Delta_{\text{fee}} > 0.01 \end{cases}$$

Every scalar calculation is quantized using strict IEEE-754 decimal rounding to ensure **zero floating-point hallucination**.

---

## 3. Settlement SLA Float Invariant

Merchant contracts guarantee settlement within fixed operating windows:
- **Standard Domestic SLA:** $T + 2$ business days ($48\text{ hours}$)
- **Weekend / Bank Holiday Window:** $T + 3$ business days ($72\text{ hours}$)

$$\text{Float Duration} = \Delta t = t_{\text{bank\_credit}} - t_{\text{gateway\_capture}}$$
$$\text{SLA Invariant Violation} \iff \Delta t > 48\text{ hours}$$

When $\Delta t > 48\text{h}$, the transaction is flagged under the **Statistical Anomaly Radar** as an unauthorized capital float hold.
