"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Users2,
  UserPlus,
  LayoutDashboard,
  ArrowLeftRight,
  Settings,
  Wallet,
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm min-[1025px]:hidden"
          onClick={close}
        />
      )}

      <div
        className={cn(
          "fixed left-0 top-0 z-20 h-screen w-[240px] bg-[#101012] border-r border-white/[0.02] transition-transform duration-300 min-[1025px]:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand Section */}
          <div className="flex h-[80px] items-center px-6 mt-6">
            <Link href="/" onClick={close}>
              <Image src={logo} alt="Splito Logo" width={120} height={120} />
            </Link>
          </div>

          {/* Main Navigation */}
          <div className="flex-1 space-y-1 px-4 py-3">
            <Link
              href="/"
              onClick={close}
              className={cn(
                "flex h-[50px] items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
                pathname === "/"
                  ? "bg-white/[0.06] text-white rounded-xl"
                  : "text-white/60 hover:bg-white/[0.03] hover:text-white hover:rounded-xl"
              )}
            >
              <LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />
              Dashboard
            </Link>

            <Link
              href="/groups"
              onClick={close}
              className={cn(
                "flex h-[50px] items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
                pathname === "/groups"
                  ? "bg-white/[0.06] text-white rounded-xl"
                  : "text-white/60 hover:bg-white/[0.03] hover:text-white hover:rounded-xl"
              )}
            >
              <Users2 className="h-5 w-5" strokeWidth={1.5} />
              Groups
            </Link>

            <Link
              href="/friends"
              onClick={close}
              className={cn(
                "flex h-[50px] items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
                pathname === "/friends"
                  ? "bg-white/[0.06] text-white rounded-xl"
                  : "text-white/60 hover:bg-white/[0.03] hover:text-white hover:rounded-xl"
              )}
            >
              <UserPlus className="h-5 w-5" strokeWidth={1.5} />
              Friends
            </Link>

            <div className="my-4 border-t border-white/[0.02]" />

            <Link
              href="/settings"
              onClick={close}
              className={cn(
                "flex h-[50px] items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-white/[0.06] text-white rounded-xl"
                  : "text-white/60 hover:bg-white/[0.03] hover:text-white hover:rounded-xl"
              )}
            >
              <Settings className="h-5 w-5" strokeWidth={1.5} />
              Settings
            </Link>
          </div>

          {/* Bottom Section */}
          <div className="p-4 mt-auto">
            <div className="rounded-xl bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/[0.03] flex items-center justify-center">
                  <Users2 className="h-5 w-5 text-white/40" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-white/40">
                    Get started with Splito
                  </div>
                </div>
              </div>
            </div>
            <a
              href="https://x.com/splitodotio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 mt-4 px-4 py-3 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-colors"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-sm font-medium pl-8">Follow us</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
