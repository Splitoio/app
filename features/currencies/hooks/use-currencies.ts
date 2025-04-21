import { useQuery } from "@tanstack/react-query";
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
  });
};

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

// Hook to get currencies organized by type and chain
export const useOrganizedCurrencies = () => {
  const { data, isLoading, error } = useGetAllCurrencies();

  return useQuery({
    queryKey: [CURRENCY_QUERY_KEYS.ORGANIZED_CURRENCIES],
    queryFn: () => {
      if (!data) return { fiatCurrencies: [], chainGroups: {} };

      // Group currencies by type (fiat vs chains)
      const fiatCurrencies = data.currencies.filter((c) => c.type === "FIAT");
      const chainCurrencies = data.currencies.filter((c) => c.type !== "FIAT");

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
    enabled: !!data,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
