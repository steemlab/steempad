// Currency conversion & reading utilities

export type CurrencyCode = "USD" | "INR" | "KRW" | "EUR";

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  INR: "₹",
  KRW: "₩",
  EUR: "€",
};

// Fallback rates relative to USD (updated periodically)
export const DEFAULT_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 87.5,
  KRW: 1420,
  EUR: 0.92,
};

export function formatFiat(
  amountUsd: number,
  currency: CurrencyCode = "USD"
): string {
  const rate = DEFAULT_RATES[currency] || 1;
  const converted = amountUsd * rate;
  const symbol = CURRENCY_SYMBOLS[currency] || "$";

  if (currency === "KRW") {
    return `${symbol}${Math.round(converted).toLocaleString()}`;
  }

  return `${symbol}${converted.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function estimateReadTime(text: string): string {
  if (!text) return "1 min read";
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}
