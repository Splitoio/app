import { apiClient } from "@/api/client";
import {
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { z } from "zod";

export const settleWithOne = async (payload: {
  groupId: string;
  settleWithId: string;
}) => {
  const response = await apiClient.post("/groups/balances", payload);
  return response.data;
};

export const settleWithEveryone = async (
  payload: {
    groupId: string;
    address: string;
  },
  wallet: StellarWalletsKit
) => {
  try {
    const unsignedTx: string = await apiClient.post(
      "/groups/settleWithEveryone",
      payload
    );

    console.log("Got unsigned tx", unsignedTx);

    const signedTx = await wallet.signTransaction(unsignedTx, {
      networkPassphrase: WalletNetwork.TESTNET,
    });

    console.log("Signed tx", signedTx);

    const submitTx = await apiClient.post("/groups/settleWithEveryone/submit", {
      signedTx: signedTx.signedTxXdr,
    });

    return submitTx.data;
  } catch (error) {
    console.error("Error settling with everyone", error);
    throw error;
  }
};

// import { useEffect, useState } from "react";
// import { StakkarWalletKit } from "stakkar-wallet-kit";

// const WalletConnect = () => {
//   const [publicKey, setPublicKey] = useState<string | null>(null);
//   const [usdAmount, setUsdAmount] = useState("");
//   const [xlmAmount, setXlmAmount] = useState("");
//   const [xlmPrice, setXlmPrice] = useState<number | null>(null);

//   const wallet = new StakkarWalletKit();

//   // Fetch real-time XLM price
//   useEffect(() => {
//     fetch("https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd")
//       .then(res => res.json())
//       .then(data => setXlmPrice(data.stellar.usd));
//   }, []);

//   const convertUsdToXlm = () => {
//     if (!xlmPrice) return;
//     setXlmAmount((parseFloat(usdAmount) / xlmPrice).toFixed(2));
//   };

//   const sendPayment = async () => {
//     if (!publicKey || !xlmAmount) return alert("Enter amount & connect wallet");

//     const response = await fetch("/api/create-transaction", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         senderPublicKey: publicKey,
//         payments: [{ recipient: "GXYZ123...", amount: xlmAmount, assetCode: "XLM" }],
//       }),
//     });

//     const { xdr } = await response.json();
//     if (!xdr) return alert("Error creating transaction");

//     // User signs the transaction
//     const signedTx = await wallet.signTransaction(xdr, "TESTNET");

//     // Submit signed transaction
//     await fetch("/api/submit-transaction", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ signedTx }),
//     });

//     alert("Transaction submitted!");
//   };

// };

// export default WalletConnect;
