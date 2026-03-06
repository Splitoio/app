"use client";

import { Menu } from "lucide-react";
import { useMobileMenu } from "@/contexts/mobile-menu";
import { useAuthStore } from "@/stores/authStore";
import { ProfileDropdown } from "@/components/profile-dropdown";

export function Header() {
  const { toggle } = useMobileMenu();
  const { user, isAuthenticated } = useAuthStore();
  const profileHref = "/settings";

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
              <ProfileDropdown user={user} profileHref={profileHref} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
