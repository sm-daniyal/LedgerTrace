"""
Natural Language Query Engine  -  LedgerTrace Conversational Financial Intelligence Engine.

A deterministic NLP query parser that maps common financial query patterns
to structured filters against reconciliation data. No external LLM API
dependency  -  purpose-built for the payment reconciliation domain.

Supports queries like:
- "Show all overcharges above 500"
- "Total fee leakage this batch"
- "Find order ORD_FS_101"
- "Which settlements are delayed?"
- "Compare gateway fees vs contracted rates"
"""

import re
import datetime
from typing import Dict, Any, List, Optional, Tuple


class QueryEngine:
    """
    Deterministic natural language query parser for financial reconciliation data.
    
    Recognizes entity types (order_id, amount, payment_method, etc.) and
    intents (search, aggregate, filter, summarize) to execute structured
    queries against the live reconciliation state.
    """

    # Intent patterns
    INTENT_PATTERNS = {
        "search": [
            r"\bfind\b", r"\bsearch\b", r"\blook\s?up\b", r"\bget\b",
            r"\bshow\s+me\b", r"\bwhere\s+is\b", r"\blocate\b"
        ],
        "aggregate": [
            r"\btotal\b", r"\bsum\b", r"\bcount\b", r"\bhow\s+many\b",
            r"\bhow\s+much\b", r"\baggregate\b"
        ],
        "compare": [
            r"\bcompare\b", r"\bvs\b", r"\bversus\b", r"\bdifference\b",
            r"\bvariance\b", r"\bdeviation\b"
        ],
        "filter": [
            r"\bshow\s+all\b", r"\blist\b", r"\bfilter\b", r"\bwhich\b",
            r"\bwhat\s+are\b"
        ],
        "summarize": [
            r"\bsummary\b", r"\bsummarize\b", r"\boverview\b",
            r"\bstatus\b", r"\breport\b", r"\bdashboard\b"
        ]
    }

    # Entity extraction patterns
    ORDER_ID_PATTERN = re.compile(r"\b(ORD[_-][\w_-]+)\b", re.IGNORECASE)
    GATEWAY_ID_PATTERN = re.compile(r"\b(pay[\w_-]+)\b", re.IGNORECASE)
    UTR_PATTERN = re.compile(r"\b(UTR[\w_-]+)\b", re.IGNORECASE)
    SETTLEMENT_PATTERN = re.compile(r"\b(SETTL[\w_-]+)\b", re.IGNORECASE)
    AMOUNT_PATTERN = re.compile(r"(?:above|over|greater\s+than|more\s+than|>|exceeding)\s*(?:INR\s*)?(\d+(?:,\d+)*(?:\.\d+)?)", re.IGNORECASE)
    AMOUNT_BELOW_PATTERN = re.compile(r"(?:below|under|less\s+than|<)\s*(?:INR\s*)?(\d+(?:,\d+)*(?:\.\d+)?)", re.IGNORECASE)

    # Discrepancy type patterns
    DISC_TYPE_PATTERNS = {
        "MDR_OVERCHARGE": [r"\bovercharge\b", r"\bfee\s+leakage\b", r"\bmdr\b", r"\bfee\b", r"\bsurcharge\b"],
        "DROPPED_WEBHOOK": [r"\bdropped\b", r"\bwebhook\b", r"\borphan\b", r"\bpending\b"],
        "SETTLEMENT_DELAY": [r"\bdelay\b", r"\bsla\b", r"\bsettlement\b", r"\bpending\s+settlement\b"],
        "MISSING_GATEWAY_RECORD": [r"\bmissing\b", r"\babandoned\b", r"\bno\s+gateway\b"]
    }

    # Payment method patterns
    PAYMENT_METHOD_PATTERNS = {
        "CREDIT_CARD": [r"\bcredit\s*card\b", r"\bcc\b"],
        "DEBIT_CARD": [r"\bdebit\s*card\b", r"\bdc\b"],
        "UPI": [r"\bupi\b"],
        "NET_BANKING": [r"\bnet\s*banking\b", r"\bneft\b", r"\bimps\b"]
    }

    CARD_NETWORK_PATTERNS = {
        "VISA": [r"\bvisa\b"],
        "MASTERCARD": [r"\bmastercard\b", r"\bmaster\s*card\b"],
        "AMEX": [r"\bamex\b", r"\bamerican\s*express\b"],
        "RUPAY": [r"\brupay\b"]
    }

    def __init__(self):
        pass

    def query(self, question: str, recon_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a natural language question and execute against reconciliation data.
        
        Args:
            question: Natural language query string
            recon_data: Full reconciliation result (from controller.process_feeds)
            
        Returns:
            Structured response with interpretation, results, and summary
        """
        question_lower = question.lower().strip()

        # Parse intent and entities
        intent = self._detect_intent(question_lower)
        entities = self._extract_entities(question)

        # Route to appropriate handler
        if entities.get("order_id"):
            results = self._search_by_order_id(entities["order_id"], recon_data)
        elif entities.get("gateway_id"):
            results = self._search_by_gateway_id(entities["gateway_id"], recon_data)
        elif entities.get("utr"):
            results = self._search_by_utr(entities["utr"], recon_data)
        elif entities.get("settlement_id"):
            results = self._search_by_settlement_id(entities["settlement_id"], recon_data)
        elif intent == "aggregate":
            results = self._handle_aggregate(question_lower, entities, recon_data)
        elif intent == "compare":
            results = self._handle_compare(question_lower, entities, recon_data)
        elif intent == "summarize":
            results = self._handle_summarize(recon_data)
        elif intent == "filter" or intent == "search":
            results = self._handle_filter(question_lower, entities, recon_data)
        else:
            results = self._handle_filter(question_lower, entities, recon_data)

        # Build response
        return {
            "query": question,
            "interpreted_as": {
                "intent": intent,
                "entities": entities
            },
            "results": results,
            "result_count": len(results.get("items", [])) if isinstance(results.get("items"), list) else 1,
            "timestamp": datetime.datetime.now().isoformat()
        }

    def _detect_intent(self, question: str) -> str:
        """Detect the query intent using pattern matching."""
        scores = {}
        for intent, patterns in self.INTENT_PATTERNS.items():
            score = sum(1 for p in patterns if re.search(p, question))
            scores[intent] = score
        
        best = max(scores, key=scores.get) if any(scores.values()) else "filter"
        return best

    def _extract_entities(self, question: str) -> Dict[str, Any]:
        """Extract structured entities from the question."""
        entities = {}

        # Order ID
        match = self.ORDER_ID_PATTERN.search(question)
        if match:
            entities["order_id"] = match.group(1)

        # Gateway ID
        match = self.GATEWAY_ID_PATTERN.search(question)
        if match:
            entities["gateway_id"] = match.group(1)

        # UTR
        match = self.UTR_PATTERN.search(question)
        if match:
            entities["utr"] = match.group(1)

        # Settlement ID
        match = self.SETTLEMENT_PATTERN.search(question)
        if match:
            entities["settlement_id"] = match.group(1)

        # Amount thresholds
        match = self.AMOUNT_PATTERN.search(question)
        if match:
            entities["amount_above"] = float(match.group(1).replace(",", ""))
        match = self.AMOUNT_BELOW_PATTERN.search(question)
        if match:
            entities["amount_below"] = float(match.group(1).replace(",", ""))

        # Discrepancy type
        q_lower = question.lower()
        for disc_type, patterns in self.DISC_TYPE_PATTERNS.items():
            if any(re.search(p, q_lower) for p in patterns):
                entities["disc_type"] = disc_type
                break

        # Payment method
        for method, patterns in self.PAYMENT_METHOD_PATTERNS.items():
            if any(re.search(p, q_lower) for p in patterns):
                entities["payment_method"] = method
                break

        # Card network
        for network, patterns in self.CARD_NETWORK_PATTERNS.items():
            if any(re.search(p, q_lower) for p in patterns):
                entities["card_network"] = network
                break

        return entities

    def _search_by_order_id(self, order_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Search across all 3 data sources for a specific order ID."""
        recon = data.get("reconciliation", data)
        results = {"items": [], "summary": ""}

        # Check reconciled orders
        for order in recon.get("reconciled_orders", []):
            if order.get("order_id", "").upper() == order_id.upper():
                results["items"].append({**order, "_source": "reconciled_orders"})

        # Check discrepancies
        for disc in recon.get("discrepancies", []):
            if disc.get("order_id", "").upper() == order_id.upper():
                results["items"].append({**disc, "_source": "discrepancies"})

        if results["items"]:
            results["summary"] = f"Found {len(results['items'])} record(s) for order {order_id}."
        else:
            results["summary"] = f"No records found for order {order_id}."

        return results

    def _search_by_gateway_id(self, gateway_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Search for a specific gateway payment ID."""
        recon = data.get("reconciliation", data)
        results = {"items": [], "summary": ""}

        for disc in recon.get("discrepancies", []):
            if disc.get("gateway_payment_id", "").lower() == gateway_id.lower():
                results["items"].append({**disc, "_source": "discrepancies"})

        for order in recon.get("reconciled_orders", []):
            if order.get("gateway_payment_id", "").lower() == gateway_id.lower():
                results["items"].append({**order, "_source": "reconciled_orders"})

        results["summary"] = f"Found {len(results['items'])} record(s) for gateway ID {gateway_id}."
        return results

    def _search_by_utr(self, utr: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Search for a specific bank UTR reference."""
        recon = data.get("reconciliation", data)
        results = {"items": [], "summary": ""}

        for order in recon.get("reconciled_orders", []):
            if order.get("bank_ref_no", "").upper() == utr.upper():
                results["items"].append({**order, "_source": "reconciled_orders"})

        results["summary"] = f"Found {len(results['items'])} record(s) for UTR {utr}."
        return results

    def _search_by_settlement_id(self, settlement_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Search for all records associated with a settlement batch."""
        recon = data.get("reconciliation", data)
        results = {"items": [], "summary": ""}

        for order in recon.get("reconciled_orders", []):
            if order.get("settlement_id", "").upper() == settlement_id.upper():
                results["items"].append({**order, "_source": "reconciled_orders"})

        for disc in recon.get("discrepancies", []):
            if disc.get("settlement_id", "").upper() == settlement_id.upper():
                results["items"].append({**disc, "_source": "discrepancies"})

        results["summary"] = f"Found {len(results['items'])} record(s) in settlement batch {settlement_id}."
        return results

    def _handle_aggregate(self, question: str, entities: Dict, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle aggregation queries (total, sum, count)."""
        recon = data.get("reconciliation", data)
        metrics = recon.get("metrics", {})
        discrepancies = recon.get("discrepancies", [])

        disc_type = entities.get("disc_type")

        if disc_type == "MDR_OVERCHARGE" or "leakage" in question or "overcharge" in question:
            filtered = [d for d in discrepancies if d.get("type") == "MDR_OVERCHARGE"]
            total = sum(d.get("impact_amount", 0) for d in filtered)
            return {
                "items": filtered,
                "aggregate": {"total_amount": round(total, 2), "count": len(filtered)},
                "summary": f"Total fee leakage from MDR overcharges: INR {total:,.2f} across {len(filtered)} transaction(s)."
            }

        elif disc_type == "SETTLEMENT_DELAY" or "delay" in question or "pending" in question:
            filtered = [d for d in discrepancies if d.get("type") == "SETTLEMENT_DELAY"]
            total = sum(d.get("impact_amount", 0) for d in filtered)
            return {
                "items": filtered,
                "aggregate": {"total_amount": round(total, 2), "count": len(filtered)},
                "summary": f"Total pending settlements beyond SLA: INR {total:,.2f} across {len(filtered)} transaction(s)."
            }

        elif "discrepanc" in question:
            return {
                "items": discrepancies,
                "aggregate": {"count": len(discrepancies)},
                "summary": f"Total discrepancies: {len(discrepancies)}."
            }

        else:
            return {
                "items": [],
                "aggregate": metrics,
                "summary": f"Reconciliation metrics: {metrics.get('reconciliation_rate', 0)}% matched, {metrics.get('discrepancy_count', 0)} discrepancies."
            }

    def _handle_compare(self, question: str, entities: Dict, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle comparison queries."""
        recon = data.get("reconciliation", data)
        metrics = recon.get("metrics", {})

        return {
            "items": [],
            "comparison": {
                "total_merchant_amount": metrics.get("total_merchant_amount", 0),
                "total_gateway_captured": metrics.get("total_gateway_captured_amount", 0),
                "total_bank_settled": metrics.get("total_bank_settled_amount", 0),
                "merchant_vs_gateway_diff": round(
                    metrics.get("total_merchant_amount", 0) - metrics.get("total_gateway_captured_amount", 0), 2
                ),
                "gateway_vs_bank_diff": round(
                    metrics.get("total_gateway_captured_amount", 0) - metrics.get("total_bank_settled_amount", 0), 2
                ),
                "fee_leakage": metrics.get("total_leakage_amount", 0)
            },
            "summary": f"3-way comparison: Merchant INR {metrics.get('total_merchant_amount', 0):,.2f} | Gateway INR {metrics.get('total_gateway_captured_amount', 0):,.2f} | Bank INR {metrics.get('total_bank_settled_amount', 0):,.2f}. Fee leakage: INR {metrics.get('total_leakage_amount', 0):,.2f}."
        }

    def _handle_summarize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle summary/overview queries."""
        recon = data.get("reconciliation", data)
        metrics = recon.get("metrics", {})
        discrepancies = recon.get("discrepancies", [])
        anomalies = recon.get("anomaly_alerts", [])

        type_counts = {}
        for d in discrepancies:
            t = d.get("type", "UNKNOWN")
            type_counts[t] = type_counts.get(t, 0) + 1

        return {
            "items": [],
            "summary_metrics": {
                "reconciliation_rate": f"{metrics.get('reconciliation_rate', 0)}%",
                "total_volume": f"INR {metrics.get('total_merchant_amount', 0):,.2f}",
                "reconciled_volume": f"INR {metrics.get('reconciled_amount', 0):,.2f}",
                "discrepancy_count": metrics.get("discrepancy_count", 0),
                "discrepancy_breakdown": type_counts,
                "fee_leakage": f"INR {metrics.get('total_leakage_amount', 0):,.2f}",
                "pending_settlement": f"INR {metrics.get('pending_settlement_amount', 0):,.2f}",
                "anomaly_count": len(anomalies)
            },
            "summary": f"Reconciliation rate: {metrics.get('reconciliation_rate', 0)}%. {metrics.get('discrepancy_count', 0)} discrepancies detected. Fee leakage: INR {metrics.get('total_leakage_amount', 0):,.2f}. {len(anomalies)} statistical anomalies flagged."
        }

    def _handle_filter(self, question: str, entities: Dict, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle filter queries with type and amount constraints."""
        recon = data.get("reconciliation", data)
        discrepancies = recon.get("discrepancies", [])
        reconciled = recon.get("reconciled_orders", [])

        items = discrepancies  # Default to discrepancies

        # Filter by discrepancy type
        disc_type = entities.get("disc_type")
        if disc_type:
            items = [d for d in items if d.get("type") == disc_type]

        # Filter by amount threshold
        amount_above = entities.get("amount_above")
        if amount_above is not None:
            items = [d for d in items if d.get("impact_amount", d.get("amount", 0)) > amount_above]

        amount_below = entities.get("amount_below")
        if amount_below is not None:
            items = [d for d in items if d.get("impact_amount", d.get("amount", 0)) < amount_below]

        # If no discrepancy filters matched, try reconciled orders
        if not items and not disc_type:
            items = reconciled
            if amount_above is not None:
                items = [o for o in items if o.get("amount", 0) > amount_above]
            if amount_below is not None:
                items = [o for o in items if o.get("amount", 0) < amount_below]

        type_label = disc_type.replace("_", " ").title() if disc_type else "all types"
        threshold_label = f" above INR {amount_above:,.0f}" if amount_above else ""
        threshold_label += f" below INR {amount_below:,.0f}" if amount_below else ""

        return {
            "items": items,
            "summary": f"Found {len(items)} record(s) matching {type_label}{threshold_label}."
        }
