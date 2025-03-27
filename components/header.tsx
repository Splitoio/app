"use client";

import { Menu, User, Wallet, Settings } from "lucide-react";
import { useMobileMenu } from "@/contexts/mobile-menu";
// import { useWallet } from "@/hooks/useWallet";
import { AddressDisplay } from "@/components/address-display";
import Image from "next/image";

import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";

export function Header() {
  const { isOpen, toggle } = useMobileMenu();
  // const { isConnected, isConnecting, address, connectWallet } = useWallet();

  // const handleWalletClick = () => {
  //   if (!isConnected) {
  //     connectWallet();
  //   }
  // };

  const { user, isAuthenticated, isLoading } = useAuthStore();

  return (
    <div className="fixed left-0 right-0 top-0 z-10 min-[1025px]:pl-[220px]">
      <div className="h-[90px]  bg-[#101012] px-4 min-[1025px]:px-6">
        <div className="flex h-full items-center">
          <button
            onClick={toggle}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F1F23] transition-colors hover:bg-[#2a2a2e] min-[1025px]:hidden"
          >
            <Menu className="h-5 w-5 text-white" strokeWidth={1.5} />
          </button>

          <div className="flex flex-1 items-center justify-end gap-2 lg:gap-4">
            {isAuthenticated && (
              <Link
                href="/settings"
                className="group relative flex h-9 sm:h-12 items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 sm:px-4 text-xs font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              >
                <Settings className="h-5 w-5 opacity-70" strokeWidth={1.2} />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            )}

            <button
              onClick={() => {
                if (!isAuthenticated) {
                  window.location.href = "/login";
                }
              }}
              disabled={isLoading}
              className="group relative flex h-9 sm:h-12 items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 sm:px-6 text-xs font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
            >
              <User className="h-6 w-6 opacity-70" strokeWidth={1.2} />
              <span className="hidden sm:inline">
                {isLoading ? (
                  "loading..."
                ) : user ? (
                  <AddressDisplay
                    address={user.email || ""}
                    className="text-white/80 text-base"
                  />
                ) : (
                  "Sign in"
                )}
              </span>
            </button>

            {isAuthenticated && user && (
              <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5">
                <div className="h-full w-full rounded-full overflow-hidden bg-[#101012]">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt="Profile"
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={`https://api.dicebear.com/9.x/identicon/svg?seed=${
                        user.id || user.email
                      }`}
                      alt="Profile"
                      width={48}
                      height={48}
                      className="h-full w-full"
                      onError={(e) => {
                        console.error(`Error loading identicon for user`);
                        // @ts-expect-error - fallback to a simpler seed
                        e.target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=user`;
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
