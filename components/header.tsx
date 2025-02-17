"use client";

import { Menu, Wallet } from "lucide-react";
import { useMobileMenu } from "@/contexts/mobile-menu";
import { useWallet } from "@/hooks/useWallet";
import { AddressDisplay } from "@/components/address-display";
import Image from "next/image";

export function Header() {
  const { isOpen, toggle } = useMobileMenu();
  const { isConnected, isConnecting, address, connectWallet } = useWallet();

  const handleWalletClick = () => {
    if (!isConnected) {
      connectWallet();
    }
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-10 min-[1025px]:pl-[280px]">
      <div className="h-[90px]  bg-[#101012] px-4 min-[1025px]:px-6">
        <div className="flex h-full items-center">
          <button
            onClick={toggle}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F1F23] transition-colors hover:bg-[#2a2a2e] min-[1025px]:hidden"
          >
            <Menu className="h-5 w-5 text-white" strokeWidth={1.5} />
          </button>

          <div className="flex flex-1 items-center justify-end gap-2 lg:gap-4">
            <button
              onClick={handleWalletClick}
              disabled={isConnecting}
              className="group relative flex h-9 sm:h-10 items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 sm:px-4 text-xs font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
            >
              <Wallet className="h-4 w-4 opacity-70" strokeWidth={1.2} />
              <span className="hidden sm:inline">
                {isConnecting ? (
                  "Connecting..."
                ) : isConnected && address ? (
                  <AddressDisplay address={address} className="text-white/80" />
                ) : (
                  "Connect Wallet"
                )}
              </span>
            </button>

            {isConnected && address && (
              <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5">
                <div className="h-full w-full rounded-full overflow-hidden bg-[#101012]">
                  <Image
                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`}
                    alt="Profile"
                    width={48}
                    height={48}
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
