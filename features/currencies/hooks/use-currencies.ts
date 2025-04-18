import { useQuery } from "@tanstack/react-query";
import { getAllCurrencies, getFiatCurrencies, getExchangeRate, convertCurrency } from "../api/client";
import { AllCurrenciesResponse, ConversionResponse, ExchangeRateResponse, FiatCurrency } from "../types";

// Query keys
const QUERY_KEYS = {
  FIAT_CURRENCIES: "fiatCurrencies",
  ALL_CURRENCIES: "allCurrencies",
  EXCHANGE_RATE: "exchangeRate",
  CURRENCY_CONVERSION: "currencyConversion"
};

// Hook to get all fiat currencies
export const useGetFiatCurrencies = () => {
  return useQuery<FiatCurrency[]>({
    queryKey: [QUERY_KEYS.FIAT_CURRENCIES],
    queryFn: getFiatCurrencies
  });
};

// Hook to get all currencies (fiat and tokens)
export const useGetAllCurrencies = () => {
  return useQuery<AllCurrenciesResponse>({
    queryKey: [QUERY_KEYS.ALL_CURRENCIES],
    queryFn: getAllCurrencies
  });
};

// Hook to get exchange rate between two currencies
export const useGetExchangeRate = (from: string, to: string) => {
  return useQuery<ExchangeRateResponse>({
    queryKey: [QUERY_KEYS.EXCHANGE_RATE, from, to],
    queryFn: () => getExchangeRate(from, to),
    // Only fetch if both currencies are provided
    enabled: !!from && !!to && from !== to
  });
};

// Hook to convert amount between currencies
export const useConvertCurrency = (
  amount: number, 
  from: string, 
  to: string,
  enabled = true
) => {
  return useQuery<ConversionResponse>({
    queryKey: [QUERY_KEYS.CURRENCY_CONVERSION, amount, from, to],
    queryFn: () => convertCurrency(amount, from, to),
    // Only fetch if amount and both currencies are provided and explicitly enabled
    enabled: !!amount && !!from && !!to && from !== to && enabled
  });
}; 