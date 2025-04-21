import { toast } from "sonner";

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Types
export interface Wallet {
  id: string;
  address: string;
  chain: string;
  isPrimary: boolean;
}

export interface ChainResponse {
  chains: Array<{
    id: string;
    name: string;
    enabled: boolean;
  }>;
}

// Get available blockchain chains
export const getAvailableChains = async (): Promise<ChainResponse> => {
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

// Add a multichain account (wallet)
export const addWallet = async ({
  chainId,
  address,
  isPrimary = false,
}: {
  chainId: string;
  address: string;
  isPrimary?: boolean;
}) => {
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
        isDefault: isPrimary,
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

    return await response.json();
  } catch (error) {
    console.error("Error adding wallet address:", error);
    toast.error(
      error instanceof Error ? error.message : "Failed to add wallet address"
    );
    throw error;
  }
};

// Get user's multichain accounts
export const getUserWallets = async () => {
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
