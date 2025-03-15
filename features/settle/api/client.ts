import { apiClient } from "@/api/client";
import {
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";

export const settleDebt = async (
  payload: {
    groupId: string;
    address: string;
    settleWithId?: string;
  },
  wallet: StellarWalletsKit
) => {
  const unsignedTx: string = await apiClient.post(
    "/groups/settle-expense/create",
    payload
  );

  const signedTx = await wallet.signTransaction(unsignedTx, {
    networkPassphrase: WalletNetwork.TESTNET,
  });

  const submitTx = await apiClient.post("/groups/settle-expense/submit", {
    signedTx: signedTx.signedTxXdr,
    groupId: payload.groupId,
  });

  return submitTx.data;
};
