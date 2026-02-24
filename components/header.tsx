"use client";

import { Menu } from "lucide-react";
import { useMobileMenu } from "@/contexts/mobile-menu";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";

export function Header() {
  const { toggle } = useMobileMenu();
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="fixed left-0 right-0 top-0 z-20 min-[1025px]:pl-[240px]">
      <div className="h-[70px] sm:h-[90px] bg-[#101012] px-4 min-[1025px]:px-6 border-b border-white/[0.02]">
        <div className="flex h-full items-center">
          <button
            onClick={toggle}
            className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#1F1F23] transition-colors hover:bg-[#2a2a2e] min-[1025px]:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5 text-white" strokeWidth={1.5} />
          </button>

          <div className="flex flex-1 items-center justify-end gap-2 lg:gap-4">
            {isAuthenticated && user && (
              <div className="h-9 w-9 sm:h-12 sm:w-12 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5">
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
