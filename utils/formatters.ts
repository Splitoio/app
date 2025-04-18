/**
 * Format a number as currency with the specified currency code
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  // Handle blockchain tokens (typically we don't use currency symbols for these)
  const isToken = !["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"].includes(
    currencyCode
  );

  if (isToken) {
    // For tokens, simply return the amount with the token symbol
    return `${amount.toFixed(6)} ${currencyCode}`;
  }

  // For fiat currencies, use the Intl.NumberFormat
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if the currency code is not supported
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}
