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

    // Extract the 'currencies' array from the response object
    const data = await response.json();
    return { currencies: data.currencies || [] };
  } catch (error) {
    console.error("Error fetching currencies:", error);
    toast.error("Failed to fetch currencies");
    throw error;
  }
};

// Get fiat currencies
export const getFiatCurrencies = async (): Promise<FiatCurrency[]> => {
  try {
    const response = await fetch(`${API_URL}/api/currency/fiat`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch fiat currencies");
    }

    // Extract the 'currencies' array from the response object
    const data = await response.json();
    return data.currencies || [];
  } catch (error) {
    console.error("Error fetching fiat currencies:", error);
    toast.error("Failed to fetch currencies");
    throw error;
  }
};

// Get exchange rate between two currencies
export const getExchangeRate = async (from: string, to: string): Promise<ExchangeRateResponse> => {
  try {
    console.log(`[getExchangeRate] Attempting to fetch rate from ${from} to ${to}`);
    
    // Try the new pricing service endpoint first
    const response = await fetch(`${API_URL}/api/pricing/exchange-rate?fromId=${from}&toId=${to}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    console.log(`[getExchangeRate] Pricing service response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`[getExchangeRate] Pricing service response data:`, data);
      
      // Convert pricing service response format to expected format
      if (data.rate !== undefined) {
        const result = {
          rate: data.rate,
          fromCurrency: from,
          toCurrency: to,
          timestamp: Date.now()
        };
        console.log(`[getExchangeRate] Returning pricing service result:`, result);
        return result;
      }
      
      console.log(`[getExchangeRate] Returning raw pricing service data:`, data);
      return data;
    }

    // Fallback to the old endpoint if the new one fails
    console.warn(`[getExchangeRate] Pricing service endpoint failed with status ${response.status}, trying fallback for ${from} to ${to}`);
    
    const fallbackResponse = await fetch(`${API_URL}/api/currencies/rate?from=${from}&to=${to}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    console.log(`[getExchangeRate] Fallback response status: ${fallbackResponse.status}`);

    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      console.log(`[getExchangeRate] Fallback response data:`, fallbackData);
      return fallbackData;
    }

    // If both endpoints fail, throw an error
    const errorMsg = `Failed to fetch exchange rate from ${from} to ${to}. Pricing service: ${response.status}, Fallback: ${fallbackResponse.status}`;
    console.error(`[getExchangeRate] ${errorMsg}`);
    throw new Error(errorMsg);

  } catch (error) {
    console.error(`[getExchangeRate] Error fetching exchange rate from ${from} to ${to}:`, error);
    
    // Don't show toast error automatically - let the component handle error display
    // toast.error("Failed to fetch exchange rate");
    
    throw error;
  }
};

// Convert amount from one currency to another
export const convertCurrency = async (
  params: { from: string; to: string; amount: number }
): Promise<ConversionResponse> => {
  try {
    const { from, to, amount } = params;
    
    // Try the direct conversion endpoint first
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

    if (response.ok) {
      return await response.json();
    }

    // Fallback: Use pricing service to get rates and calculate manually
    console.warn(`Direct conversion failed, using pricing service fallback for ${amount} ${from} to ${to}`);
    
    // Get price of target currency in source currency
    const priceResponse = await fetch(`${API_URL}/api/pricing/price?id=${to}&baseCurrency=${from}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (priceResponse.ok) {
      const priceData = await priceResponse.json();
      if (priceData.price) {
        // Convert: amount_in_source / price_of_target_in_source = amount_in_target
        const convertedAmount = amount / priceData.price;
        return {
          fromAmount: amount,
          fromCurrency: from,
          toAmount: convertedAmount,
          toCurrency: to,
          rate: 1 / priceData.price
        };
      }
    }

    // Final fallback: Use exchange rate
    const exchangeRate = await getExchangeRate(from, to);
    const convertedAmount = amount * exchangeRate.rate;
    
    return {
      fromAmount: amount,
      fromCurrency: from,
      toAmount: convertedAmount,
      toCurrency: to,
      rate: exchangeRate.rate
    };

  } catch (error) {
    console.error("Error converting currency:", error);
    // toast.error("Failed to convert currency"); // Let component handle error display
    throw error;
  }
};
