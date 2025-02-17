"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Users2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu } from "@/contexts/mobile-menu";

const navigation = [
  { name: "Overview", href: "/", icon: Home },
  { name: "My Groups", href: "/groups", icon: Users2 },
  { name: "Friends", href: "/friends", icon: UserPlus },
];

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
          "fixed left-0 top-0 z-20 h-screen w-[280px] bg-[#101012] transition-transform duration-300 min-[1025px]:translate-x-0 overflow-hidden flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Section */}
        <div className="flex-none p-6 border-b border-white/[0.02]">
          <Link href="/" className="block" onClick={close}>
            <Image
              src={logo}
              alt="Logo"
              width={120}
              height={48}
              className="h-12 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 px-3 py-8">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-normal rounded-lg transition-colors",
                    isActive 
                      ? "text-white/90 bg-white/[0.06]" 
                      : "text-white/60 hover:text-white/90 hover:bg-white/[0.03]"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "h-4 w-4",
                      isActive ? "opacity-90" : "opacity-70"
                    )} 
                    strokeWidth={1.2} 
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Section - Could add user profile or other controls here */}
        <div className="flex-none p-6 border-t border-white/[0.02]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 text-sm">
            <div className="h-8 w-8 rounded-full bg-white/[0.03] flex items-center justify-center">
              <Users2 className="h-4 w-4 opacity-40" strokeWidth={1.2} />
            </div>
            <span>Splito v0.1.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
