import { toast } from "sonner";

interface Wallet {
  id: string;
  address: string;
  chain: string;
  isPrimary: boolean;
}

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.splito.app";

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
