"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useGroups } from "@/stores/groups";
import { calculateBalances } from "@/utils/calculations";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";

import Image from "next/image";
import { Expense, GroupBalance } from "@/api/modelSchema";

interface SettleDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: GroupBalance[];
}


// const WalletConnect = () => {
//   const [publicKey, setPublicKey] = useState<string | null>(null);
//   const [usdAmount, setUsdAmount] = useState("");
//   const [xlmAmount, setXlmAmount] = useState("");
//   const [xlmPrice, setXlmPrice] = useState<number | null>(null);

//   const { address, connectWallet, disconnectWallet, isConnected, isConnecting } = useWallet();


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

//   return (
//     <div>
//       <button onClick={async () => setPublicKey(await wallet.connect())}>
//         {publicKey ? "Connected" : "Connect Wallet"}
//       </button>
      
//       <input
//         type="number"
//         placeholder="Enter USD amount"
//         value={usdAmount}
//         onChange={(e) => setUsdAmount(e.target.value)}
//       />
      
//       <button onClick={convertUsdToXlm}>Convert</button>
//       <p>XLM Amount: {xlmAmount}</p>

//       <button onClick={sendPayment} disabled={!publicKey || !xlmAmount}>
//         Send Payment
//       </button>
//     </div>
//   );
// };

export function SettleDebtsModal({ isOpen, onClose, balances }: SettleDebtsModalProps) {
  const { groups } = useGroups();
  const { address, connectWallet, disconnectWallet, isConnected, isConnecting } = useWallet();
  // const { totalOwe } = calculateBalances(groups, address);

  console.log(balances);

  const totalOwe = balances.filter(item => item.amount > 0).reduce((acc, expense) => {
    return acc + expense.amount;
  }, 0);

  async function handleSettleOne() {
    if (!isConnected) {
      await connectWallet();
    }
    if (!address) return;
    console.log("Settle one");
  }

  function handleSettleEveryone() {
    console.log("Settle everyone");
  }


  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 h-screen w-screen"
          {...fadeIn}
        >
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px]">
            <motion.div className="animate-border-light" {...scaleIn}>
              <div className="relative rounded-[14.77px] bg-black p-3 lg:p-6">
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <h2 className="text-xl lg:text-2xl font-semibold text-white tracking-[-0.03em]">
                    Settle Debts
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 lg:p-1.5 hover:bg-white/10 transition-colors"
                  >
                    <X className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                  </button>
                </div>

                {isConnected && address && <div className="text-body-sm text-white/50 mb-4">
                  Connected with {address?.slice(0, 25) + "..."}
                </div>}

                <div className="space-y-3">
                  <motion.button
                    onClick={() => {
                      if (!isConnected) {
                        connectWallet();
                      } else{
                       disconnectWallet();
                      }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-[42px] rounded-[15px] bg-[#1F1F23] text-sm font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white flex items-center justify-center gap-2"
                  >
                    {isConnected && address ? "Disconnect Wallet" : "Connect Wallet"}
                  </motion.button>

                  {isConnected && address && <div className="space-y-2">
                    <motion.button
                      onClick={handleSettleOne}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-[42px] rounded-[15px] bg-[#1F1F23] text-sm font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white flex items-center justify-center gap-2"
                    >
                      <Image
                        src={"/settleOne.svg"}
                        alt="Settle One"
                        width={20}
                        height={20}
                      />
                      Settle with one
                    </motion.button>
                    <motion.button
                    onClick={handleSettleEveryone}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-[50px] rounded-[15px] bg-[#1F1F23] text-body font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white flex items-center justify-center gap-2"
                    >
                      <Image
                        src={"/settleEveryone.svg"}
                        alt="Settle Everyone"
                        width={20}
                        height={20}
                      />
                      Settle with everyone{" "}
                      <span
                        className={
                          totalOwe > 0 ? "text-[#FF4444]" : "text-[#53e45d]"
                        }
                      >
                        (${totalOwe.toFixed(2)})
                      </span>
                    </motion.button>
                  </div>}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
