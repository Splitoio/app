import { apiClient } from "@/api-helpers/client";
import {
  AllCurrenciesResponse,
  ConversionResponse,
  ExchangeRateResponse,
  FiatCurrency,
} from "../types";

// Get all supported fiat currencies
export const getFiatCurrencies = async (): Promise<FiatCurrency[]> => {
  const response = await apiClient.get("/currencies/fiat");
  return response.data;
};

// Get all supported currencies (fiat and tokens)
export const getAllCurrencies = async (): Promise<AllCurrenciesResponse> => {
  const response = await apiClient.get("/currencies/all");
  return response.data;
};

// Get exchange rate between two currencies
export const getExchangeRate = async (
  from: string,
  to: string
): Promise<ExchangeRateResponse> => {
  const response = await apiClient.get(
    `/currencies/rate?from=${from}&to=${to}`
  );
  return response.data;
};

// Convert amount between currencies
export const convertCurrency = async (
  amount: number,
  from: string,
  to: string
): Promise<ConversionResponse> => {
  const response = await apiClient.get(
    `/currencies/convert?amount=${amount}&from=${from}&to=${to}`
  );
  return response.data;
};
