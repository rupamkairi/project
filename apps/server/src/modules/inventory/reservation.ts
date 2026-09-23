export interface StockLevel {
  onHand: number
  reserved: number
}

function qty(n: number): number {
  const q = Math.round(Number(n))
  if (!Number.isFinite(q) || q <= 0) throw new Error('quantity must be a positive integer')
  return q
}

export function availableQty(level: StockLevel): number {
  return level.onHand - level.reserved
}

export function applyReserve(level: StockLevel, n: number): StockLevel {
  const q = qty(n)
  if (availableQty(level) < q) throw new Error(`insufficient stock: available ${availableQty(level)}, requested ${q}`)
  return { onHand: level.onHand, reserved: level.reserved + q }
}

export function applyRelease(level: StockLevel, n: number): StockLevel {
  const q = qty(n)
  if (level.reserved < q) throw new Error(`insufficient reserved stock: reserved ${level.reserved}, requested ${q}`)
  return { onHand: level.onHand, reserved: level.reserved - q }
}

export function applyDeduct(level: StockLevel, n: number): StockLevel {
  const q = qty(n)
  if (level.reserved < q) throw new Error(`insufficient reserved stock: reserved ${level.reserved}, requested ${q}`)
  if (level.onHand < q) throw new Error(`insufficient stock: on-hand ${level.onHand}, requested ${q}`)
  return { onHand: level.onHand - q, reserved: level.reserved - q }
}
