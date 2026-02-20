// Money - always use integer in smallest unit (paise, cents)
export interface Money {
  amount: number; // integer in smallest unit
  currency: string;
}

// Money operations - all amounts are integers to avoid floating point issues
export function moneyAdd(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot add different currencies: ${a.currency} and ${b.currency}`,
    );
  }
  return {
    amount: a.amount + b.amount,
    currency: a.currency,
  };
}

export function moneySubtract(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot subtract different currencies: ${a.currency} and ${b.currency}`,
    );
  }
  return {
    amount: a.amount - b.amount,
    currency: a.currency,
  };
}

export function moneyMultiply(m: Money, factor: number): Money {
  return {
    amount: Math.round(m.amount * factor),
    currency: m.currency,
  };
}

export function moneyFormat(m: Money, locale: string = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
  }).format(m.amount / 100);
}

// Pagination
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface SortSpec {
  field: string;
  order: "asc" | "desc";
}

export interface PageOptions {
  page?: number;
  limit?: number;
  sort?: SortSpec[];
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    hasNext: page * limit < total,
  };
}

export function getDefaultPageOptions(): PageOptions {
  return {
    page: 1,
    limit: 20,
    sort: [],
  };
}
