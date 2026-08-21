# Strict mathematical calculations for MDR and GST to prevent rounding errors.

def calculate_expected_fee(amount: float, rate_percentage: float) -> float:
    # Calculate fee rounded to 2 decimal places.
    return round((amount * rate_percentage) / 100.0, 2)

def calculate_expected_gst(fee: float, gst_rate: float = 0.18) -> float:
    # 18% standard GST on gateway processing fees in India.
    return round(fee * gst_rate, 2)

def calculate_expected_net(gross_amount: float, fee: float, tax: float) -> float:
    return round(gross_amount - (fee + tax), 2)

def verify_mdr_invariants(gross_amount: float, charged_fee: float, charged_tax: float, contracted_rate: float, tolerance: float = 0.05):
    expected_fee = calculate_expected_fee(gross_amount, contracted_rate)
    expected_tax = calculate_expected_gst(expected_fee)
    expected_net = calculate_expected_net(gross_amount, expected_fee, expected_tax)
    actual_net = calculate_expected_net(gross_amount, charged_fee, charged_tax)
    
    fee_diff = round(charged_fee - expected_fee, 2)
    tax_diff = round(charged_tax - expected_tax, 2)
    net_diff = round(actual_net - expected_net, 2)
    
    is_valid = abs(fee_diff) <= tolerance and abs(tax_diff) <= tolerance
    
    return {
        "is_valid": is_valid,
        "contracted_rate": contracted_rate,
        "expected_fee": expected_fee,
        "charged_fee": charged_fee,
        "fee_diff": fee_diff,
        "expected_tax": expected_tax,
        "charged_tax": charged_tax,
        "tax_diff": tax_diff,
        "expected_net": expected_net,
        "actual_net": actual_net,
        "net_diff": net_diff
    }
