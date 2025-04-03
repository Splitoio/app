import { apiClient } from "@/api-helpers/client";
import {
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";

type UnsignedTxResponse = {
  serializedTx: string;
  txHash: string;
  settlementId: string;
};

export const settleDebt = async (
  payload: {
    groupId: string;
    address: string;
    settleWithId?: string;
  },
  wallet: StellarWalletsKit
) => {
  const unsignedTx: UnsignedTxResponse = await apiClient.post(
    "/groups/settle-transaction/create",
    payload
  );

  const signedTx = await wallet.signTransaction(unsignedTx.serializedTx, {
    networkPassphrase: WalletNetwork.TESTNET,
  });

  const submitTx = await apiClient.post("/groups/settle-transaction/submit", {
    signedTx: signedTx.signedTxXdr,
    groupId: payload.groupId,
    settlementId: unsignedTx.settlementId,
    settleWithId: payload.settleWithId,
  });

  return submitTx.data;
};
