"use client";

import { useWallet } from "@/hooks/useWallet";
import { Users } from "lucide-react";
import Image from "next/image";

export function UserProfile() {
  const { isConnected, address } = useWallet();

  if (!isConnected || !address) {
    return (
      <div className="flex items-center gap-3 text-white/70">
        <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
          <Users className="h-5 w-5 text-white/40" />
        </div>
        <p className="text-sm">Please connect your wallet</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5">
        <div className="h-full w-full rounded-full overflow-hidden bg-[#101012]">
          <Image
            src={`https://api.dicebear.com/9.x/identicon/svg?seed=${address}`}
            alt="Profile"
            width={40}
            height={40}
            className="h-full w-full"
            onError={(e) => {
              console.error(`Error loading identicon for address`);
              // @ts-expect-error - fallback to a simpler seed
              e.target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=user`;
            }}
          />
        </div>
      </div>
      <div>
        <p className="font-medium text-white">
          {typeof address === "string" && address.length >= 10
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "No Address"}
        </p>
      </div>
    </div>
  );
}
