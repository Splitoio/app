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
          "fixed left-0 top-0 z-20 h-screen w-[280px] bg-[#101012] transition-transform duration-300 min-[1025px]:translate-x-0 overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="relative h-full">
          <div className="p-8">
            <Link href="/" className="block" onClick={close}>
              <Image
                src={logo}
                alt="Logo"
                width={140}
                height={56}
                className="h-14 w-auto"
                priority
              />
            </Link>
          </div>

          <nav className="flex flex-col justify-center h-[60%] mt-8 space-y-12 px-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex items-center gap-4 text-[18px] font-medium text-white/80 transition-colors hover:text-white",
                    isActive && "text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.5} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
