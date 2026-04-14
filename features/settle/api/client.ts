import { apiClient } from "@/api-helpers/client";
import {
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import {
  RawTransaction
} from "@aptos-labs/ts-sdk";

type UnsignedTxResponse = {
  serializedTx: string;
  transaction?: {
    function?: string;
    typeArguments?: string[];
    functionArguments?: any[];
    recpAddress?: string;
  };
  txHash: string;
  settlementId: string;
  tokenSymbol?: string;
  chainName?: string;
  rawtx: RawTransaction;
  address: string;
  amount?: number;
};
// Type for Stellar wallet
type StellarWallet = StellarWalletsKit;

// Type for Aptos wallet
type AptosWalletContextType = {
  account: any;
  signTransaction?: (args: any) => Promise<any>;
  submitTransaction?: (transaction: any) => Promise<any>;
  signAndSubmitTransaction?: (transaction: any) => Promise<any>;
  connected: boolean;
};

// Union type for both wallet types
type WalletType = StellarWallet | AptosWalletContextType;

// Helper function to determine if wallet is Stellar
const isStellarWallet = (wallet: WalletType): wallet is StellarWallet => {
  // Check if it's a Stellar wallet by looking for StellarWalletsKit specific properties
  const hasSignTransaction = wallet && typeof (wallet as StellarWallet).signTransaction === 'function';
  const doesNotHaveConnectedProperty = !('connected' in wallet);
  const isStellarKit = wallet && wallet.constructor &&
    (wallet.constructor.name === 'StellarWalletsKit' ||
      Object.getPrototypeOf(wallet)?.constructor?.name === 'StellarWalletsKit');

  const isStellar = wallet && hasSignTransaction && (doesNotHaveConnectedProperty || isStellarKit);

  return isStellar;
};

// Helper function to determine if wallet is Aptos
const isAptosWallet = (wallet: WalletType): wallet is AptosWalletContextType => {
  // Check if it has the connected property as boolean (Aptos wallet pattern)
  const hasConnectedBoolean = wallet && typeof (wallet as AptosWalletContextType).connected === 'boolean';
  const hasAccount = wallet && 'account' in wallet;
  const hasSignTransaction = wallet && 'signTransaction' in wallet;

  const isAptos = wallet && hasConnectedBoolean && (hasAccount || hasSignTransaction);

  return isAptos;
};

// Settle debt function for Stellar chain
const settleDebtStellar = async (
  payload: {
    groupId: string;
    address: string;
    settleWithId?: string;
    selectedTokenId?: string;
    selectedChainId?: string;
    amount?: number;
    expenseId?: string;
  },
  unsignedTx: UnsignedTxResponse,
  wallet: StellarWallet
) => {
  // Now we need the wallet to sign the transaction
  // Determine the correct network passphrase based on the wallet's configuration
  let networkPassphrase = WalletNetwork.TESTNET;

  try {
    // Try to get the wallet's current network configuration
    const walletConfig = (wallet as any).config;

    if (walletConfig && walletConfig.network) {
      networkPassphrase = walletConfig.network;
    }
  } catch (error) {
    console.error("[settleDebtStellar] Could not determine wallet network, using TESTNET as default", error);
  }

  const signedTx = await wallet.signTransaction(unsignedTx.serializedTx, {
    networkPassphrase,
  });

  const submitPayload = {
    signedTx: signedTx.signedTxXdr,
    groupId: payload.groupId,
    settlementId: unsignedTx.settlementId,
    settleWithId: payload.settleWithId,
  };

  const submitTx = await apiClient.post("/groups/settle-transaction/submit", submitPayload);
  return submitTx.data;
};

// Settle debt function for Aptos chain
const settleDebtAptos = async (
  payload: {
    groupId: string;
    address: string;
    settleWithId?: string;
    selectedTokenId?: string;
    selectedChainId?: string;
    amount?: number;
    expenseId?: string;
  },
  unsignedTx: UnsignedTxResponse,
  wallet: AptosWalletContextType
) => {
  // Check if wallet is connected before proceeding with signing
  if (!wallet.connected) {
    console.error("[settleDebtAptos] Wallet not connected");
    throw new Error("Wallet is not connected. Please connect your Aptos wallet first.");
  }

  if (!wallet.account) {
    console.error("[settleDebtAptos] No account found in wallet");
    throw new Error("No account found. Please ensure your wallet is properly connected.");
  }

  // Get address from account (handle different types)
  const walletAddress = typeof wallet.account.address === 'string'
    ? wallet.account.address
    : wallet.account.address?.toString();

  if (!walletAddress) {
    console.error("[settleDebtAptos] Unable to extract wallet address");
    throw new Error("Unable to get wallet address. Please ensure your wallet is properly connected.");
  }

  if (!wallet.signAndSubmitTransaction) {
    console.error("[settleDebtAptos] Wallet does not support signAndSubmitTransaction");
    throw new Error("Wallet does not support signAndSubmitTransaction. Please use a compatible Aptos wallet.");
  }

  try {
    // Use the transaction data from backend to build the payload
    const amountInOctas = Math.floor(parseFloat(unsignedTx.amount?.toString() || "0") * 100000000);
    const transactionPayload = {
      data: {
        function: unsignedTx.transaction?.function || "0x1::coin::transfer",
        typeArguments: unsignedTx.transaction?.typeArguments || ["0x1::aptos_coin::AptosCoin"],
        functionArguments: unsignedTx.transaction?.functionArguments || [
          unsignedTx.transaction?.recpAddress, // recipient address
          amountInOctas // amount
        ],
      },
    };

    // Use signAndSubmitTransaction to handle both signing and submission
    const transactionResponse = await wallet.signAndSubmitTransaction(transactionPayload);

    const submitPayload = {
      signedTx: transactionResponse.hash,
      txHash: transactionResponse.hash,
      groupId: payload.groupId,
      settlementId: unsignedTx.settlementId,
      settleWithId: payload.settleWithId,
    };

    const submitTx = await apiClient.post("/groups/settle-transaction/submit", submitPayload);
    return submitTx.data;

  } catch (error) {
    console.error("[settleDebtAptos] Error during transaction signing/submission:", {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      payload,
      walletAddress
    });

    if (error instanceof Error) {
      // Handle specific wallet errors
      if (error.message.includes("User rejected")) {
        console.error("[settleDebtAptos] User rejected transaction");
        throw new Error("Transaction was rejected by user.");
      } else if (error.message.includes("Insufficient funds")) {
        console.error("[settleDebtAptos] Insufficient funds error");
        throw new Error("Insufficient funds to complete the transaction.");
      } else if (error.message.includes("Network")) {
        console.error("[settleDebtAptos] Network error");
        throw new Error("Network error. Please check your connection and try again.");
      }
    }

    throw error;
  }
};

export const settleDebt = async (
  payload: {
    groupId: string;
    address: string;
    settleWithId?: string;
    selectedTokenId?: string;
    selectedChainId?: string;
    amount?: number;
    expenseId?: string;
  },
  wallet: WalletType | undefined
) => {
  // Create the transaction - no wallet needed here, just the user's address
  const unsignedTx: UnsignedTxResponse = await apiClient.post(
    "/groups/settle-transaction/create",
    payload
  );

  if (!wallet) {
    console.error("[settleDebt] No wallet provided - this might be because:");
    console.error("1. Stellar wallet is not connected via useWallet() hook");
    console.error("2. Aptos wallet is not passed as customWallet parameter to useSettleDebt()");
    console.error("3. Wallet connection was lost");
    throw new Error("Wallet is not connected. Please connect your wallet first.");
  }

  // Determine wallet type and route to appropriate handler
  const stellarCheck = isStellarWallet(wallet);

  if (stellarCheck) {
    return settleDebtStellar(payload, unsignedTx, wallet);
  }

  const aptosCheck = isAptosWallet(wallet);

  if (aptosCheck) {
    return settleDebtAptos(payload, unsignedTx, wallet);
  }

  console.error("[settleDebt] Unsupported wallet type detected:", {
    wallet,
    walletType: typeof wallet,
    walletKeys: wallet ? Object.keys(wallet) : 'no wallet',
    walletConstructor: wallet && (wallet as any).constructor ? (wallet as any).constructor.name : 'unknown',
    stellarCheck,
    aptosCheck,
    walletStringified: JSON.stringify(wallet, null, 2)
  });

  // Try to give more specific error message based on wallet structure
  if (wallet && typeof wallet === 'object') {
    const walletObj = wallet as any;
    if ('signTransaction' in walletObj && !('connected' in walletObj)) {
      throw new Error("Detected a wallet with signTransaction but no 'connected' property. This might be a Stellar wallet that's not properly initialized.");
    } else if ('connected' in walletObj && !walletObj.connected) {
      throw new Error("Aptos wallet detected but not connected. Please connect your Aptos wallet first.");
    } else if ('account' in walletObj && 'signTransaction' in walletObj) {
      throw new Error("Detected what appears to be an Aptos wallet, but wallet type detection failed. Please check wallet connection.");
    }
  }

  throw new Error("Unsupported wallet type. Please connect a Stellar or Aptos wallet.");
};
