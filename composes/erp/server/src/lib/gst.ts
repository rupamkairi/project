export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(gstin: string): { valid: boolean; stateCode: string; pan: string } {
  if (!GSTIN_REGEX.test(gstin)) return { valid: false, stateCode: "", pan: "" };
  return {
    valid: true,
    stateCode: gstin.substring(0, 2),
    pan: gstin.substring(2, 12),
  };
}

export function computeInvoiceGst(params: {
  orgGstin: string;
  partyGstin?: string;
  lineItems: Array<{ lineTotal: number; gstRate: number }>;
}): { cgst: number; sgst: number; igst: number } {
  const orgState = params.orgGstin.substring(0, 2);
  const partyState = params.partyGstin?.substring(0, 2);
  const isIntraState = partyState ? orgState === partyState : true;

  let totalCgst = 0, totalSgst = 0, totalIgst = 0;

  for (const item of params.lineItems) {
    const gstAmt = item.lineTotal * item.gstRate / 100;
    if (isIntraState) {
      totalCgst += gstAmt / 2;
      totalSgst += gstAmt / 2;
    } else {
      totalIgst += gstAmt;
    }
  }

  return {
    cgst: Math.round(totalCgst * 100) / 100,
    sgst: Math.round(totalSgst * 100) / 100,
    igst: Math.round(totalIgst * 100) / 100,
  };
}

export const INDIA_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
  "24": "Gujarat", "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
  "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh (New)",
};

export const TDS_SECTIONS: Record<string, { description: string; rateIndividual: number; rateCompany: number; threshold: number }> = {
  "194C": { description: "Contractor payment", rateIndividual: 1, rateCompany: 2, threshold: 30000 },
  "194J": { description: "Professional services", rateIndividual: 10, rateCompany: 10, threshold: 30000 },
  "194I": { description: "Rent", rateIndividual: 10, rateCompany: 10, threshold: 240000 },
  "194H": { description: "Commission", rateIndividual: 5, rateCompany: 5, threshold: 15000 },
};

export function computeTds(
  subtotal: number,
  tdsSection: string | undefined,
  vendorType: "individual" | "company" | string,
): number {
  if (!tdsSection) return 0;
  const section = TDS_SECTIONS[tdsSection];
  if (!section || subtotal < section.threshold) return 0;
  const rate = vendorType === "individual" ? section.rateIndividual : section.rateCompany;
  return Math.round(subtotal * rate / 100 * 100) / 100;
}
