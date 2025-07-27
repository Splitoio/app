import { apiClient } from "@/api-helpers/client";
import {
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import {
  Aptos,
  AptosConfig,
  Network,
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

// Type for Stellar wallet
type StellarWallet = StellarWalletsKit;

// Type for Aptos wallet
type AptosWalletContextType = {
  account: any;
  signTransaction?: (args: any) => Promise<any>;
  submitTransaction?: (transaction: any) => Promise<any>;
  connected: boolean;
};

// Union type for both wallet types
type WalletType = StellarWallet | AptosWalletContextType;

// Helper function to determine if wallet is Stellar
const isStellarWallet = (wallet: WalletType): wallet is StellarWallet => {
  console.log("[isStellarWallet] Checking wallet type:", {
    hasWallet: !!wallet,
    hasSignTransaction: wallet && typeof (wallet as StellarWallet).signTransaction === 'function',
    hasConnectedProperty: wallet && 'connected' in wallet,
    connectedValue: wallet && (wallet as AptosWalletContextType).connected,
    walletConstructorName: wallet && wallet.constructor ? wallet.constructor.name : 'unknown',
    walletPrototype: wallet && Object.getPrototypeOf(wallet)?.constructor?.name
  });
  
  // Check if it's a Stellar wallet by looking for StellarWalletsKit specific properties
  const hasSignTransaction = wallet && typeof (wallet as StellarWallet).signTransaction === 'function';
  const doesNotHaveConnectedProperty = !(wallet as AptosWalletContextType).connected;
  const isStellarKit = wallet && wallet.constructor && 
    (wallet.constructor.name === 'StellarWalletsKit' || 
     Object.getPrototypeOf(wallet)?.constructor?.name === 'StellarWalletsKit');
  
  const isStellar = wallet && hasSignTransaction && (doesNotHaveConnectedProperty || isStellarKit);
  
  console.log("[isStellarWallet] Analysis:", {
    hasSignTransaction,
    doesNotHaveConnectedProperty,
    isStellarKit,
    result: isStellar
  });
  
  return isStellar;
};

// Helper function to determine if wallet is Aptos
const isAptosWallet = (wallet: WalletType): wallet is AptosWalletContextType => {
  console.log("[isAptosWallet] Checking wallet type:", {
    hasWallet: !!wallet,
    hasConnectedProperty: wallet && 'connected' in wallet,
    connectedType: wallet && typeof (wallet as AptosWalletContextType).connected,
    connectedValue: wallet && (wallet as AptosWalletContextType).connected,
    hasAccount: wallet && 'account' in wallet,
    hasSignTransaction: wallet && 'signTransaction' in wallet
  });
  
  // Check if it has the connected property as boolean (Aptos wallet pattern)
  const hasConnectedBoolean = wallet && typeof (wallet as AptosWalletContextType).connected === 'boolean';
  const hasAccount = wallet && 'account' in wallet;
  const hasSignTransaction = wallet && 'signTransaction' in wallet;
  
  const isAptos = wallet && hasConnectedBoolean && (hasAccount || hasSignTransaction);
  
  console.log("[isAptosWallet] Analysis:", {
    hasConnectedBoolean,
    hasAccount,
    hasSignTransaction,
    result: isAptos
  });
  
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
  },
  unsignedTx: UnsignedTxResponse,
  wallet: StellarWallet
) => {
  console.log("[settleDebtStellar] Starting Stellar settlement process", {
    payload,
    unsignedTx: {
      txHash: unsignedTx.txHash,
      settlementId: unsignedTx.settlementId,
      tokenSymbol: unsignedTx.tokenSymbol,
      chainName: unsignedTx.chainName,
      serializedTxLength: unsignedTx.serializedTx?.length
    }
  });

  // Now we need the wallet to sign the transaction
  // Determine the correct network passphrase based on the wallet's configuration
  let networkPassphrase = WalletNetwork.TESTNET;
  
  console.log("[settleDebtStellar] Determining network configuration...");
  try {
    // Try to get the wallet's current network configuration
    const walletConfig = (wallet as any).config;
    console.log("[settleDebtStellar] Wallet config:", walletConfig);
    
    if (walletConfig && walletConfig.network) {
      networkPassphrase = walletConfig.network;
      console.log("[settleDebtStellar] Using wallet network:", networkPassphrase);
    } else {
      console.log("[settleDebtStellar] No wallet network config found, using default");
    }
  } catch (error) {
    console.log("[settleDebtStellar] Could not determine wallet network, using TESTNET as default", error);
  }

  // Log what is being sent to signTransaction
  console.log("[settleDebtStellar] About to call wallet.signTransaction with:", {
    serializedTx: unsignedTx.serializedTx,
    type: typeof unsignedTx.serializedTx,
    length: unsignedTx.serializedTx?.length,
    options: { networkPassphrase }
  });

  console.log("[settleDebtStellar] Calling wallet.signTransaction...");
  const signedTx = await wallet.signTransaction(unsignedTx.serializedTx, {
    networkPassphrase,
  });
  console.log("[settleDebtStellar] signedTx received:", {
    hasSignedTxXdr: !!signedTx.signedTxXdr,
    signedTxXdrLength: signedTx.signedTxXdr?.length,
    signedTx
  });

  const submitPayload = {
    signedTx: signedTx.signedTxXdr,
    groupId: payload.groupId,
    settlementId: unsignedTx.settlementId,
    settleWithId: payload.settleWithId,
  };

  console.log("[settleDebtStellar] POST /groups/settle-transaction/submit", submitPayload);

  console.log("[settleDebtStellar] Submitting signed transaction to backend...");
  const submitTx = await apiClient.post("/groups/settle-transaction/submit", submitPayload);
  console.log("[settleDebtStellar] submitTx response received:", {
    status: submitTx.status,
    data: submitTx.data,
    hasData: !!submitTx.data
  });

  console.log("[settleDebtStellar] Stellar settlement completed successfully");
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
  },
  unsignedTx: UnsignedTxResponse,
  wallet: AptosWalletContextType
) => {
  console.log("[settleDebtAptos] Starting Aptos settlement process", {
    payload,
    unsignedTx: {
      txHash: unsignedTx.txHash,
      settlementId: unsignedTx.settlementId,
      tokenSymbol: unsignedTx.tokenSymbol,
      chainName: unsignedTx.chainName,
      serializedTxLength: unsignedTx.serializedTx?.length
    },
    walletInfo: {
      connected: wallet.connected,
      hasAccount: !!wallet.account,
      hasSignTransaction: !!wallet.signTransaction,
      hasSubmitTransaction: !!wallet.submitTransaction
    }
  });

  // Check if wallet is connected before proceeding with signing
  console.log("[settleDebtAptos] Validating wallet connection...");
  if (!wallet.connected) {
    console.error("[settleDebtAptos] Wallet not connected");
    throw new Error("Wallet is not connected. Please connect your Aptos wallet first.");
  }
  console.log("[settleDebtAptos] Wallet connection validated");

  if (!wallet.account) {
    console.error("[settleDebtAptos] No account found in wallet");
    throw new Error("No account found. Please ensure your wallet is properly connected.");
  }
  console.log("[settleDebtAptos] Wallet account found:", {
    accountType: typeof wallet.account,
    hasAddress: !!wallet.account.address
  });

  // Get address from account (handle different types)
  const walletAddress = typeof wallet.account.address === 'string' 
    ? wallet.account.address 
    : wallet.account.address?.toString();
    
  console.log("[settleDebtAptos] Extracted wallet address:", {
    address: walletAddress,
    addressType: typeof walletAddress,
    originalAddressType: typeof wallet.account.address
  });

  if (!walletAddress) {
    console.error("[settleDebtAptos] Unable to extract wallet address");
    throw new Error("Unable to get wallet address. Please ensure your wallet is properly connected.");
  }

  if (!wallet.signTransaction) {
    console.error("[settleDebtAptos] Wallet does not support transaction signing");
    throw new Error("Wallet does not support transaction signing.");
  }
  console.log("[settleDebtAptos] Wallet transaction signing capability confirmed");

  try {
    // Parse the serialized transaction
    console.log("[settleDebtAptos] Parsing serialized transaction...");
    let transaction;
    try {
      console.log("[settleDebtAptos] Converting hex string to Uint8Array...");
      
      // Validate hex string format
      if (!unsignedTx.serializedTx || typeof unsignedTx.serializedTx !== 'string') {
        throw new Error("Invalid serialized transaction: not a string");
      }
      
      // Remove any 0x prefix if present
      const cleanHex = unsignedTx.serializedTx.replace(/^0x/, '');
      
      // Validate hex string (even length, valid hex characters)
      if (cleanHex.length % 2 !== 0) {
        throw new Error("Invalid hex string: odd length");
      }
      
      if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
        throw new Error("Invalid hex string: contains non-hex characters");
      }
      
      // Convert hex string to Uint8Array
      const serializedTxBytes = new Uint8Array(
        cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      console.log("[settleDebtAptos] Serialized transaction bytes length:", serializedTxBytes.length);
      
      if (serializedTxBytes.length === 0) {
        throw new Error("Empty transaction bytes after hex conversion");
      }
      
      console.log("[settleDebtAptos] Creating deserializer...");
      const deserializer = new Deserializer(serializedTxBytes);
      
      console.log("[settleDebtAptos] Deserializing raw transaction...");
      const deserializedTxn = RawTransaction.deserialize(deserializer);
      transaction = deserializedTxn;
      console.log("[settleDebtAptos] Transaction deserialized successfully:", {
        transactionType: typeof transaction,
        hasSequenceNumber: transaction && 'sequence_number' in transaction,
        hasSender: transaction && 'sender' in transaction,
        transaction
      });
    } catch (parseError) {
      console.error("[settleDebtAptos] Failed to parse serialized transaction:", {
        error: parseError,
        errorMessage: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        serializedTx: unsignedTx.serializedTx,
        serializedTxType: typeof unsignedTx.serializedTx,
        serializedTxLength: unsignedTx.serializedTx?.length,
        isValidHex: /^(0x)?[0-9a-fA-F]*$/.test(unsignedTx.serializedTx || ''),
        hasEvenLength: (unsignedTx.serializedTx?.replace(/^0x/, '')?.length || 0) % 2 === 0
      });
      
      // Provide more specific error message based on the parse error
      if (parseError instanceof Error) {
        if (parseError.message.includes("hex")) {
          throw new Error("Invalid transaction format: malformed hex string received from server.");
        } else if (parseError.message.includes("deserialize") || parseError.message.includes("Deserializer")) {
          throw new Error("Invalid transaction format: failed to deserialize transaction data.");
        }
      }
      
      throw new Error("Invalid transaction format received from server.");
    }

    // Log what is being sent to signTransaction
    console.log("[settleDebtAptos] About to call wallet.signTransaction with:", {
      transaction,
      type: typeof transaction,
      walletAddress: walletAddress,
      transactionStructure: transaction ? Object.keys(transaction) : 'null'
    });

    console.log("\n=== 3. Signing transaction ===\n");
    console.log("[settleDebtAptos] Calling wallet.signTransaction...");
    
    // Sign the transaction using the wallet (similar to Stellar flow)
    const signedTransaction = await wallet.signTransaction({
      transactionOrPayload: transaction
    });
    console.log("[settleDebtAptos] Transaction signed successfully:", {
      signedTransactionType: typeof signedTransaction,
      hasSignature: signedTransaction && 'signature' in signedTransaction,
      signedTransaction
    });

    console.log("\n=== 4. Submitting signed transaction to backend ===\n");
    const submitPayload = {
      signedTx: signedTransaction,
      groupId: payload.groupId,
      settlementId: unsignedTx.settlementId,
      settleWithId: payload.settleWithId,
    };

    // Submit the signed transaction to our backend (similar to Stellar flow)
    console.log("[settleDebtAptos] POST /groups/settle-transaction/submit", submitPayload);

    console.log("[settleDebtAptos] Submitting signed transaction to backend...");
    const submitTx = await apiClient.post("/groups/settle-transaction/submit", submitPayload);
    console.log("[settleDebtAptos] submitTx response received:", {
      status: submitTx.status,
      data: submitTx.data,
      hasData: !!submitTx.data
    });

    console.log("\n=== 5. Transaction settlement completed ===\n");
    console.log("[settleDebtAptos] Aptos settlement completed successfully");
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
  },
  wallet: WalletType | undefined
) => {
  console.log("[settleDebt] === STARTING SETTLEMENT PROCESS ===");
  console.log("[settleDebt] Input parameters:", {
    payload: {
      groupId: payload.groupId,
      address: payload.address,
      settleWithId: payload.settleWithId,
      selectedTokenId: payload.selectedTokenId,
      selectedChainId: payload.selectedChainId,
      amount: payload.amount
    },
    walletProvided: !!wallet,
    walletType: wallet ? typeof wallet : 'undefined'
  });

  console.log("[settleDebt] POST /groups/settle-transaction/create", payload);
  
  console.log("[settleDebt] Creating unsigned transaction...");
  // Create the transaction - no wallet needed here, just the user's address
  const unsignedTx: UnsignedTxResponse = await apiClient.post(
    "/groups/settle-transaction/create",
    payload
  );
  console.log("[settleDebt] unsignedTx response received:", {
    txHash: unsignedTx.txHash,
    settlementId: unsignedTx.settlementId,
    tokenSymbol: unsignedTx.tokenSymbol,
    chainName: unsignedTx.chainName,
    serializedTxLength: unsignedTx.serializedTx?.length,
    hasSerializedTx: !!unsignedTx.serializedTx,
    message: "iam here"
  });

  // Check if wallet is connected before proceeding with signing
  console.log("[settleDebt] Validating wallet availability...", {
    walletProvided: !!wallet,
    walletType: typeof wallet,
    walletConstructor: wallet && (wallet as any).constructor ? (wallet as any).constructor.name : 'unknown',
    walletStringified: wallet ? JSON.stringify(wallet, null, 2) : 'null'
  });
  
  if (!wallet) {
    console.error("[settleDebt] No wallet provided - this might be because:");
    console.error("1. Stellar wallet is not connected via useWallet() hook");
    console.error("2. Aptos wallet is not passed as customWallet parameter to useSettleDebt()");
    console.error("3. Wallet connection was lost");
    throw new Error("Wallet is not connected. Please connect your wallet first.");
  }
  console.log("[settleDebt] Wallet is available, determining wallet type...");

  // Determine wallet type and route to appropriate handler
  console.log("[settleDebt] Checking if wallet is Stellar...");
  const stellarCheck = isStellarWallet(wallet);
  
  if (stellarCheck) {
    console.log("[settleDebt] ✓ Using Stellar wallet - routing to settleDebtStellar");
    return settleDebtStellar(payload, unsignedTx, wallet);
  } 
  
  console.log("[settleDebt] Checking if wallet is Aptos...");
  const aptosCheck = isAptosWallet(wallet);
  
  if (aptosCheck) {
    console.log("[settleDebt] ✓ Using Aptos wallet - routing to settleDebtAptos");
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
