export const rstConfig = {
  swiggyHmacSecret: process.env.RST_SWIGGY_HMAC_SECRET ?? '',
  zomatoHmacSecret: process.env.RST_ZOMATO_HMAC_SECRET ?? '',
  uberEatsHmacSecret: process.env.RST_UBEREATS_HMAC_SECRET ?? '',
  kitchenSlaMinutes: parseInt(process.env.RST_KITCHEN_SLA_MINUTES ?? '20'),
  shiftVarianceThreshold: parseFloat(process.env.RST_SHIFT_VARIANCE_THRESHOLD ?? '200'),
  serviceChargePct: parseFloat(process.env.RST_SERVICE_CHARGE_PCT ?? '10'),
} as const
