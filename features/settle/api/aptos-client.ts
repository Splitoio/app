import { apiClient } from "@/api-helpers/client";

import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  U64,
  RawTransaction,
  Deserializer,
} from "@aptos-labs/ts-sdk";

type UnsignedTxResponse = {
  serializedTx: string;
  txHash: string;
  settlementId: string;
  tokenSymbol?: string;
  chainName?: string;
};

// Use a more flexible type that matches the actual wallet adapter
type AptosWalletContextType = {
  account: any; // Use any to avoid type conflicts between different versions
  signTransaction?: (args: any) => Promise<any>;
  submitTransaction?: (transaction: any) => Promise<any>;
  signAndSubmitTransaction?: (transaction: any) => Promise<any>;
  connected: boolean;
};

export const settleDebtAptos = async (
  payload: {
    groupId: string;
    address: string;
    settleWithId?: string;
    selectedTokenId?: string;
    selectedChainId?: string;
    amount?: number;
  },
  wallet: AptosWalletContextType | undefined
) => {
  console.log("[settleDebtAptos] POST /groups/settle-transaction/create", payload);
  
  // Create the transaction - no wallet needed here, just the user's address
  const unsignedTx: UnsignedTxResponse = await apiClient.post(
    "/groups/settle-transaction/create",
    payload
  );
  console.log("[settleDebtAptos] unsignedTx response", unsignedTx);

  // Check if wallet is connected before proceeding with signing
  if (!wallet || !wallet.connected) {
    throw new Error("Wallet is not connected. Please connect your Aptos wallet first.");
  }

  if (!wallet.account) {
    throw new Error("No account found. Please ensure your wallet is properly connected.");
  }

  // Get address from account (handle different types)
  const walletAddress = typeof wallet.account.address === 'string' 
    ? wallet.account.address 
    : wallet.account.address?.toString();
    
  if (!walletAddress) {
    throw new Error("Unable to get wallet address. Please ensure your wallet is properly connected.");
  }

  if (!wallet.signTransaction) {
    throw new Error("Wallet does not support transaction signing.");
  }

  // Initialize Aptos client
  const aptosConfig = new AptosConfig({ 
    network: Network.TESTNET // Use testnet by default, can be made configurable
  });
  const aptos = new Aptos(aptosConfig);

  try {
    // Parse the serialized transaction
    // The serialized transaction should be in a format that can be deserialized
    let transaction;
    try {
      // Convert base64 string to Uint8Array before deserialization
      const serializedTxBytes = Uint8Array.from(atob(unsignedTx.serializedTx), c => c.charCodeAt(0));
      const deserializer = new Deserializer(serializedTxBytes);
      const deserializedTxn = RawTransaction.deserialize(deserializer);
      transaction = deserializedTxn;
      console.log("[settleDebtAptos] deserialized transaction 11111111111111111111111111111111111", transaction);
    } catch (parseError) {
      console.error("[settleDebtAptos] Failed to parse serialized transaction:", parseError);
      throw new Error("Invalid transaction format received from server.");
    }

    // Log what is being sent to signTransaction
    console.log("[settleDebtAptos] About to call wallet.signTransaction with:", {
      transaction,
      type: typeof transaction,
      walletAddress: walletAddress
    });

    // Sign the transaction using the wallet
    const signedTransaction = await wallet.signTransaction({
      transactionOrPayload: transaction
    });
    console.log("[settleDebtAptos] signedTransaction", signedTransaction);

    // Submit the signed transaction to our backend
    console.log("[settleDebtAptos] POST /groups/settle-transaction/submit", {
      signedTx: signedTransaction,
      groupId: payload.groupId,
      settlementId: unsignedTx.settlementId,
      settleWithId: payload.settleWithId,
    });

    const submitTx = await apiClient.post("/groups/settle-transaction/submit", {
      signedTx: signedTransaction,
      groupId: payload.groupId,
      settlementId: unsignedTx.settlementId,
      settleWithId: payload.settleWithId,
    });
    console.log("[settleDebtAptos] submitTx response", submitTx);

    return submitTx.data;

  } catch (error) {
    console.error("[settleDebtAptos] Error during transaction signing/submission:", error);
    
    if (error instanceof Error) {
      // Handle specific wallet errors
      if (error.message.includes("User rejected")) {
        throw new Error("Transaction was rejected by user.");
      } else if (error.message.includes("Insufficient funds")) {
        throw new Error("Insufficient funds to complete the transaction.");
      } else if (error.message.includes("Network")) {
        throw new Error("Network error. Please check your connection and try again.");
      }
    }
    
    throw error;
  }
};

// Alternative version using wallet.submitTransaction if available
export const settleDebtAptosWithSubmit = async (
  payload: {
    groupId: string;
    address: string;
    settleWithId?: string;
    selectedTokenId?: string;
    selectedChainId?: string;
    amount?: number;
  },
  wallet: AptosWalletContextType | undefined
) => {
  console.log("[settleDebtAptosWithSubmit] POST /groups/settle-transaction/create", payload);
  
  // Create the transaction - no wallet needed here, just the user's address
  const unsignedTx: UnsignedTxResponse = await apiClient.post(
    "/groups/settle-transaction/create",
    payload
  );
  console.log("[settleDebtAptosWithSubmit] unsignedTx response", unsignedTx);

  // Check if wallet is connected before proceeding with signing
  if (!wallet || !wallet.connected) {
    throw new Error("Wallet is not connected. Please connect your Aptos wallet first.");
  }

  if (!wallet.account) {
    throw new Error("No account found. Please ensure your wallet is properly connected.");
  }

  // Get address from account (handle different types)
  const walletAddress = typeof wallet.account.address === 'string' 
    ? wallet.account.address 
    : wallet.account.address?.toString();
    
  if (!walletAddress) {
    throw new Error("Unable to get wallet address. Please ensure your wallet is properly connected.");
  }

  if (!wallet.submitTransaction) {
    throw new Error("Wallet does not support transaction submission.");
  }

  try {
    // Parse the serialized transaction
    let transaction;
    try {
      transaction = JSON.parse(unsignedTx.serializedTx);
    } catch (parseError) {
      console.error("[settleDebtAptosWithSubmit] Failed to parse serialized transaction:", parseError);
      throw new Error("Invalid transaction format received from server.");
    }

    // Log what is being sent to submitTransaction
    console.log("[settleDebtAptosWithSubmit] About to call wallet.submitTransaction with:", {
      transaction,
      type: typeof transaction,
      walletAddress: walletAddress
    });

    // Submit the transaction directly through the wallet
    const transactionResponse = await wallet.submitTransaction(transaction);
    console.log("[settleDebtAptosWithSubmit] transactionResponse", transactionResponse);

    // Submit the transaction hash to our backend for tracking
    console.log("[settleDebtAptosWithSubmit] POST /groups/settle-transaction/submit", {
      txHash: transactionResponse.hash,
      groupId: payload.groupId,
      settlementId: unsignedTx.settlementId,
      settleWithId: payload.settleWithId,
    });

    const submitTx = await apiClient.post("/groups/settle-transaction/submit", {
      txHash: transactionResponse.hash,
      groupId: payload.groupId,
      settlementId: unsignedTx.settlementId,
      settleWithId: payload.settleWithId,
    });
    console.log("[settleDebtAptosWithSubmit] submitTx response", submitTx);

    return submitTx.data;

  } catch (error) {
    console.error("[settleDebtAptosWithSubmit] Error during transaction submission:", error);
    
    if (error instanceof Error) {
      // Handle specific wallet errors
      if (error.message.includes("User rejected")) {
        throw new Error("Transaction was rejected by user.");
      } else if (error.message.includes("Insufficient funds")) {
        throw new Error("Insufficient funds to complete the transaction.");
      } else if (error.message.includes("Network")) {
        throw new Error("Network error. Please check your connection and try again.");
      }
    }
    
    throw error;
  }
};
