// Minor<->major boundary conversions. The sagas hold integer minor
// units end to end; the ledger createJournal contract takes major
// units and converts back via toMinorUnits (round-trip exact). Kept
// local so compose code never imports module internals; parity with
// the ledger helpers is locked by tests.
const CURRENCY_DECIMALS: Record<string, number> = {
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  JPY: 0,
  VND: 0,
  KRW: 0,
  CLP: 0,
  UGX: 0,
  UZS: 0,
  TMT: 0,
  XOF: 0,
  XAF: 0,
  XPF: 0,
  GNF: 0,
  KMF: 0,
  PYG: 0,
  RWF: 0,
  VUV: 0,
  DJF: 0,
  GYD: 0,
}

export function currencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2
}

export function toMajorUnits(minorAmount: number, currency: string): number {
  return minorAmount / 10 ** currencyDecimals(currency)
}
