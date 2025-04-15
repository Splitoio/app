"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Users2,
  UserPlus,
  LayoutDashboard,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu } from "@/contexts/mobile-menu";

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useMobileMenu();
  const logo = "/logo.svg";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 brightness-50 min-[1025px]:hidden z-50"
          onClick={close}
        />
      )}

      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[260px] bg-[#101012] transition-all duration-300 ease-in-out shadow-xl min-[1025px]:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand Section */}
          <div className="flex h-[70px] sm:h-[80px] items-center px-6 mt-2 sm:mt-4 relative">
            <Link href="/" onClick={close} className="z-10">
              <Image src={logo} alt="Splito Logo" width={120} height={120} />
            </Link>

            {/* Close button positioned as an overlay */}
            <button
              onClick={close}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-[#17171A] text-white/70 hover:text-white transition-colors min-[1025px]:hidden"
              aria-label="Close menu"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Main Navigation */}
          <div className="flex-1 space-y-1 px-4 py-4 sm:py-6">
            <Link
              href="/"
              onClick={close}
              className={cn(
                "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                pathname === "/"
                  ? "bg-white/[0.07] text-white shadow-sm"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />
              Dashboard
            </Link>

            <Link
              href="/groups"
              onClick={close}
              className={cn(
                "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                pathname === "/groups" || pathname.startsWith("/groups/")
                  ? "bg-white/[0.07] text-white shadow-sm"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <Users2 className="h-5 w-5" strokeWidth={1.5} />
              Groups
            </Link>

            <Link
              href="/friends"
              onClick={close}
              className={cn(
                "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                pathname === "/friends"
                  ? "bg-white/[0.07] text-white shadow-sm"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <UserPlus className="h-5 w-5" strokeWidth={1.5} />
              Friends
            </Link>

            <div className="my-4 sm:my-5 border-t border-white/[0.04]" />

            <Link
              href="/settings"
              onClick={close}
              className={cn(
                "flex h-[45px] sm:h-[50px] items-center gap-3 rounded-xl px-4 text-mobile-base sm:text-[15px] font-medium transition-all",
                pathname === "/settings"
                  ? "bg-white/[0.07] text-white shadow-sm"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <Settings className="h-5 w-5" strokeWidth={1.5} />
              Settings
            </Link>
          </div>

          {/* Bottom Section */}
          <div className="p-4 mt-auto">
            <div className="rounded-xl bg-[#17171A] p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/[0.05] flex items-center justify-center">
                  <Users2
                    className="h-4 sm:h-5 w-4 sm:w-5 text-white/50"
                    strokeWidth={1.5}
                  />
                </div>
                <a href="https://splito-j33y.vercel.app/signup">
                  <div className="flex-1">
                    <div className="text-mobile-sm sm:text-sm text-white/50">
                      Get started with Splito
                    </div>
                  </div>
                </a>
              </div>
            </div>
            <a
              href="https://x.com/splitodotio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 mt-4 px-4 py-3 rounded-lg text-white/40 hover:text-white/70 hover:bg-[#17171A] transition-colors"
            >
              <svg
                className="h-4 sm:h-5 w-4 sm:w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-mobile-sm sm:text-sm font-medium ml-1">
                Follow us
              </span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
