import { toast } from "sonner";

interface Wallet {
  id: string;
  address: string;
  chain: string;
  isPrimary: boolean;
}

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Helper function to handle API errors
const handleApiError = (error: any, fallbackMessage: string) => {
  console.error("API Error:", error);
  const message =
    error?.response?.data?.message || error?.message || fallbackMessage;
  toast.error(message);
  throw error;
};

// Get user's wallets
export const getUserWallets = async (userId?: string): Promise<Wallet[]> => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const response = await fetch(`${API_URL}/users/${userId}/wallets`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch wallets: ${response.status}`);
    }

    const data = await response.json();
    return data.wallets || [];
  } catch (error) {
    return handleApiError(error, "Failed to load wallets. Please try again.");
  }
};

// Add a new wallet
export const addWallet = async (
  userId: string,
  walletData: Omit<Wallet, "id">
): Promise<Wallet> => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/wallets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(walletData),
    });

    if (!response.ok) {
      throw new Error(`Failed to add wallet: ${response.status}`);
    }

    const data = await response.json();
    return data.wallet;
  } catch (error) {
    return handleApiError(error, "Failed to add wallet. Please try again.");
  }
};

// Update wallet (set as primary)
export const updateWallet = async (
  userId: string,
  walletId: string,
  isPrimary: boolean
): Promise<Wallet> => {
  try {
    const response = await fetch(
      `${API_URL}/users/${userId}/wallets/${walletId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ isPrimary }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update wallet: ${response.status}`);
    }

    const data = await response.json();
    return data.wallet;
  } catch (error) {
    return handleApiError(error, "Failed to update wallet. Please try again.");
  }
};

// Remove wallet
export const removeWallet = async (
  userId: string,
  walletId: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${API_URL}/users/${userId}/wallets/${walletId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to remove wallet: ${response.status}`);
    }

    return true;
  } catch (error) {
    handleApiError(error, "Failed to remove wallet. Please try again.");
    return false;
  }
};

// API endpoints for multichain integration
export const getAvailableChains = async () => {
  try {
    const response = await fetch(`${API_URL}/api/multichain/chains`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch available chains");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching available chains:", error);
    toast.error("Failed to fetch available chains");
    throw error;
  }
};

export const addMultichainAccount = async (
  chainId: string,
  address: string,
  isDefault: boolean
) => {
  try {
    console.log(
      `Adding chain account - ChainID: ${chainId}, Address: ${address}`
    );

    const response = await fetch(`${API_URL}/api/multichain/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        chainId,
        address,
        isDefault,
      }),
    });

    if (!response.ok) {
      // Try to get a more specific error message from the response
      let errorMessage = "Failed to add wallet address";
      try {
        const errorData = await response.json();
        console.error("Server error response:", errorData);
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If we can't parse the error JSON, use the default message
        console.error("Could not parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    toast.success("Wallet address added successfully");
    return await response.json();
  } catch (error) {
    console.error("Error adding wallet address:", error);
    toast.error(
      error instanceof Error ? error.message : "Failed to add wallet address"
    );
    throw error;
  }
};

export const getUserMultichainAccounts = async () => {
  try {
    const response = await fetch(`${API_URL}/api/multichain/accounts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user accounts");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user accounts:", error);
    toast.error("Failed to fetch wallet accounts");
    throw error;
  }
};

export const getTokensForChain = async (chainId: string) => {
  try {
    const response = await fetch(
      `${API_URL}/api/multichain/tokens/${chainId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens for chain ${chainId}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching tokens for chain ${chainId}:`, error);
    toast.error(`Failed to fetch tokens for selected chain`);
    throw error;
  }
};

// Get fiat currencies
export const getFiatCurrencies = async () => {
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

    return await response.json();
  } catch (error) {
    console.error("Error fetching fiat currencies:", error);
    toast.error("Failed to fetch currencies");
    throw error;
  }
};

// Get all currencies (both fiat and crypto)
export const getAllCurrencies = async () => {
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
