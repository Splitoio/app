"use client";

import { Menu } from "lucide-react";
import { useMobileMenu } from "@/contexts/mobile-menu";
import { cn } from "@/lib/utils";

export function MobileMenuToggle() {
  const { isOpen, toggle } = useMobileMenu();

  return (
    <button
      onClick={toggle}
      className={cn(
        "fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#1F1F23]/80 backdrop-blur-sm transition-all hover:bg-[#2a2a2e] shadow-md min-[1025px]:hidden",
        isOpen ? "opacity-0 pointer-events-none translate-x-2" : "opacity-100"
      )}
      aria-label="Toggle menu"
    >
      <Menu className="h-5 w-5 text-white" strokeWidth={1.5} />
    </button>
  );
}
