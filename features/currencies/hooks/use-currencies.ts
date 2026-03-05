import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  getAllCurrencies,
  getFiatCurrencies,
  getExchangeRate,
  convertCurrency,
  CurrencyResponse,
  FiatCurrency,
  ExchangeRateResponse,
  ConversionResponse,
  Currency,
} from "../api/client";

// Query keys
export const CURRENCY_QUERY_KEYS = {
  FIAT_CURRENCIES: "fiatCurrencies",
  ALL_CURRENCIES: "all-currencies",
  EXCHANGE_RATE: "exchangeRate",
  CURRENCY_CONVERSION: "currencyConversion",
  ORGANIZED_CURRENCIES: "organized-currencies",
};

// Hook to get all fiat currencies
export const useGetFiatCurrencies = () => {
  return useQuery<FiatCurrency[]>({
    queryKey: [CURRENCY_QUERY_KEYS.FIAT_CURRENCIES],
    queryFn: getFiatCurrencies,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

// Hook to fetch all currencies
export const useGetAllCurrencies = () => {
  return useQuery({
    queryKey: [CURRENCY_QUERY_KEYS.ALL_CURRENCIES],
    queryFn: getAllCurrencies,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook to get exchange rate between two currencies
export const useGetExchangeRate = (from: string, to: string) => {
  return useQuery<ExchangeRateResponse>({
    queryKey: [CURRENCY_QUERY_KEYS.EXCHANGE_RATE, from, to],
    queryFn: () => getExchangeRate(from, to),
    // Only fetch if both currencies are provided
    enabled: !!from && !!to && from !== to,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once to avoid spamming errors
    retryDelay: 1000, // Wait 1 second before retry
  });
};

/** Convert multiple balance amounts to a single total in default currency using exchange rates */
export function useConvertedBalanceTotal(
  items: { amount: number; currency: string }[],
  defaultCurrency: string
): { total: number; isLoading: boolean } {
  const distinctCurrencies = useMemo(
    () =>
      items.length && defaultCurrency
        ? [...new Set(items.map((i) => i.currency))].filter(
            (c) => c && c !== defaultCurrency
          )
        : [],
    [items, defaultCurrency]
  );

  const rateQueries = useQueries({
    queries: distinctCurrencies.map((from) => ({
      queryKey: [CURRENCY_QUERY_KEYS.EXCHANGE_RATE, from, defaultCurrency],
      queryFn: () => getExchangeRate(from, defaultCurrency),
      staleTime: 1000 * 60 * 5,
      retry: 1,
    })),
  });

  const isLoading = rateQueries.some((q) => q.isLoading);
  const rates: Record<string, number> = { [defaultCurrency]: 1 };
  distinctCurrencies.forEach((c, i) => {
    rates[c] = rateQueries[i]?.data?.rate ?? 1;
  });

  const total =
    items.length === 0
      ? 0
      : !defaultCurrency
        ? items.reduce((s, i) => s + i.amount, 0)
        : items.reduce(
            (sum, i) =>
              sum +
              i.amount * (rates[i.currency] ?? (i.currency === defaultCurrency ? 1 : 0)),
            0
          );

  return { total, isLoading };
}

// Hook to convert an amount between currencies
export const useConvertCurrency = (
  amount: number,
  from: string,
  to: string
) => {
  return useQuery<ConversionResponse>({
    queryKey: [CURRENCY_QUERY_KEYS.CURRENCY_CONVERSION, amount, from, to],
    queryFn: () => convertCurrency({ amount, from, to }),
    // Only fetch if all parameters are provided
    enabled: !!amount && !!from && !!to && from !== to,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Type for organized currencies
export interface OrganizedCurrencies {
  fiatCurrencies: Currency[];
  chainGroups: Record<string, Currency[]>;
}

// Map FiatCurrency to Currency for merging
function toCurrency(f: FiatCurrency): Currency {
  return {
    id: f.id,
    name: f.name,
    symbol: f.symbol,
    type: "FIAT",
    chainId: null,
    logoUrl: f.logoUrl ?? null,
  };
}

// Fallback fiat list so the dropdown always shows multiple options even when API returns few/none
const FALLBACK_FIAT: Currency[] = [
  { id: "USD", name: "US Dollar", symbol: "$", type: "FIAT", chainId: null, logoUrl: null },
  { id: "EUR", name: "Euro", symbol: "€", type: "FIAT", chainId: null, logoUrl: null },
  { id: "GBP", name: "British Pound", symbol: "£", type: "FIAT", chainId: null, logoUrl: null },
  { id: "JPY", name: "Japanese Yen", symbol: "¥", type: "FIAT", chainId: null, logoUrl: null },
  { id: "THB", name: "Thai Baht", symbol: "฿", type: "FIAT", chainId: null, logoUrl: null },
  { id: "INR", name: "Indian Rupee", symbol: "₹", type: "FIAT", chainId: null, logoUrl: null },
  { id: "AUD", name: "Australian Dollar", symbol: "A$", type: "FIAT", chainId: null, logoUrl: null },
  { id: "CAD", name: "Canadian Dollar", symbol: "C$", type: "FIAT", chainId: null, logoUrl: null },
  { id: "SGD", name: "Singapore Dollar", symbol: "S$", type: "FIAT", chainId: null, logoUrl: null },
  { id: "CHF", name: "Swiss Franc", symbol: "Fr", type: "FIAT", chainId: null, logoUrl: null },
];

// Hook to get currencies organized by type and chain.
// Merges in fiat from /api/currency/fiat when /api/currency/all returns few or no fiat,
// so the dropdown always shows a full list (USD, EUR, GBP, JPY, etc.).
export const useOrganizedCurrencies = () => {
  const { data: allData, isLoading: allLoading } = useGetAllCurrencies();
  const { data: fiatList, isLoading: fiatLoading } = useGetFiatCurrencies();

  return useQuery({
    queryKey: [
      CURRENCY_QUERY_KEYS.ORGANIZED_CURRENCIES,
      allData?.currencies?.length ?? 0,
      fiatList?.length ?? 0,
    ],
    queryFn: () => {
      const fromAll = allData?.currencies ?? [];
      const fiatFromAll = fromAll.filter((c) => c.type === "FIAT");
      const chainCurrencies = fromAll.filter((c) => c.type !== "FIAT");

      // Merge fiat: prefer all, then fiat endpoint, then fallback so we always show multiple
      const byId = new Map<string, Currency>();
      fiatFromAll.forEach((c) => byId.set(c.id, c));
      (fiatList ?? []).forEach((f) => {
        if (!byId.has(f.id)) byId.set(f.id, toCurrency(f));
      });
      if (byId.size < 3) {
        FALLBACK_FIAT.forEach((c) => {
          if (!byId.has(c.id)) byId.set(c.id, c);
        });
      }
      const fiatCurrencies = Array.from(byId.values()).sort((a, b) =>
        a.id.localeCompare(b.id)
      );

      // Group chain currencies by their chainId
      const chainGroups: Record<string, Currency[]> = {};
      chainCurrencies.forEach((currency) => {
        const chainId = currency.chainId || "Unknown";
        if (!chainGroups[chainId]) {
          chainGroups[chainId] = [];
        }
        chainGroups[chainId].push(currency);
      });

      return { fiatCurrencies, chainGroups };
    },
    enabled: !!allData || !!fiatList,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
