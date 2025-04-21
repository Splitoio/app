import { toast } from "sonner";

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Types
export interface Currency {
  id: string;
  name: string;
  symbol: string;
  type: "FIAT" | "native" | "token";
  chainId: string | null;
  logoUrl: string | null;
  decimals?: number;
  contractAddress?: string;
  enabled?: boolean;
  exchangeRateSource?: string;
}

export interface CurrencyResponse {
  currencies: Currency[];
}

export interface FiatCurrency {
  id: string;
  name: string;
  symbol: string;
  type: "FIAT";
  logoUrl: string | null;
}

export interface ExchangeRateResponse {
  rate: number;
  fromCurrency: string;
  toCurrency: string;
  timestamp: number;
}

export interface ConversionResponse {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
}

// Get all currencies (both fiat and crypto)
export const getAllCurrencies = async (): Promise<CurrencyResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/currency/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch currencies");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching currencies:", error);
    toast.error("Failed to fetch currencies");
    throw error;
  }
};

// Get fiat currencies
export const getFiatCurrencies = async (): Promise<FiatCurrency[]> => {
  try {
    const response = await fetch(`${API_URL}/api/currencies/fiat`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch fiat currencies");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching fiat currencies:", error);
    toast.error("Failed to fetch currencies");
    throw error;
  }
};

// Get exchange rate between two currencies
export const getExchangeRate = async (from: string, to: string): Promise<ExchangeRateResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/currencies/rate?from=${from}&to=${to}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate from ${from} to ${to}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching exchange rate from ${from} to ${to}:`, error);
    toast.error("Failed to fetch exchange rate");
    throw error;
  }
};

// Convert amount from one currency to another
export const convertCurrency = async (
  params: { from: string; to: string; amount: number }
): Promise<ConversionResponse> => {
  try {
    const { from, to, amount } = params;
    const response = await fetch(
      `${API_URL}/api/currencies/convert?from=${from}&to=${to}&amount=${amount}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to convert ${amount} ${from} to ${to}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error converting currency:", error);
    toast.error("Failed to convert currency");
    throw error;
  }
};
