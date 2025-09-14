# Aptos Wallet Context Flow in Splito App

## Overview
This document explains how the Aptos wallet context flows through your application and where the `signAndSubmitTransaction` method comes from.

## Flow Diagram

```
@aptos-labs/wallet-adapter-react (External Package)
    ↓ provides useWallet() hook with signAndSubmitTransaction
    ↓
hooks/useWallet.ts (Your Custom Hook)
    ↓ wraps and manages both Stellar & Aptos wallets
    ↓ exposes aptosWallet with signAndSubmitTransaction
    ↓
features/settle/hooks/use-splits.ts (Settlement Hook)
    ↓ gets wallet from useWallet()
    ↓ creates walletToUse with signAndSubmitTransaction
    ↓
features/settle/api/client.ts (Settlement API)
    ↓ receives wallet context in settleDebtAptos()
    ↓ calls wallet.signAndSubmitTransaction()
```

## Key Components

### 1. External Wallet Adapter (`@aptos-labs/wallet-adapter-react`)
- Provides the core `useWallet()` hook
- Includes methods: `signTransaction`, `submitTransaction`, `signAndSubmitTransaction`
- Used in components like `WalletSelector.tsx`

### 2. Your Custom Wallet Hook (`hooks/useWallet.ts`)
- Wraps the Aptos wallet adapter
- Manages both Stellar and Aptos wallets in one interface
- Exposes `aptosWallet` with all wallet adapter methods

### 3. Settlement Hook (`features/settle/hooks/use-splits.ts`)
- Uses your custom `useWallet()` hook
- Creates `walletToUse` context for API calls
- Passes wallet context to `settleDebt()` function

### 4. Settlement API (`features/settle/api/client.ts`)
- Receives wallet context with `signAndSubmitTransaction`
- Now uses this method instead of separate sign + submit steps

## What Changed

### Before (Two-step process):
1. `wallet.signTransaction()` - Sign the transaction
2. Submit signed transaction to backend
3. Backend submits to blockchain

### After (One-step process):
1. `wallet.signAndSubmitTransaction()` - Sign AND submit to blockchain
2. Get transaction hash from response
3. Send transaction hash to backend for tracking

## Benefits of signAndSubmitTransaction

1. **Simpler Flow**: One method call instead of two
2. **Better UX**: Wallet handles the entire process
3. **Less Error-Prone**: No need to manage signed transaction state
4. **Standard Compliant**: Uses the official Aptos wallet adapter pattern
5. **Frontend Submission**: Transaction is submitted directly from the frontend

## Usage Example

```typescript
// OLD WAY (complex, two-step)
const signedTx = await wallet.signTransaction({ transactionOrPayload: tx });
const submitResult = await wallet.submitTransaction(signedTx);

// NEW WAY (simple, one-step) 
const result = await wallet.signAndSubmitTransaction({
  data: {
    function: "0x1::coin::transfer",
    typeArguments: ["0x1::aptos_coin::AptosCoin"],
    functionArguments: [recipientAddress, amount]
  }
});
```

## Wallet Compatibility

The `signAndSubmitTransaction` method is available in:
- Petra Wallet
- Martian Wallet
- Aptos Connect
- Most Aptos wallet adapter compatible wallets

## Error Handling

If a wallet doesn't support `signAndSubmitTransaction`, the code will throw:
```
"Wallet does not support signAndSubmitTransaction. Please use a compatible Aptos wallet."
```

This ensures users know they need to use a compatible wallet.
