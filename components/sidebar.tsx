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

            <div className="fixed left-0 top-0 z-20 h-full w-[280px] bg-[#101012] border-r border-white/[0.02]">
                <div className="flex h-full flex-col">
                    {/* Logo/Brand Section */}
                    <div className="flex h-[80px] items-center px-6">
                        <span className="text-xl font-semibold text-white">
                            Splito
                        </span>
                    </div>

                    {/* Main Navigation */}
                    <div className="flex-1 space-y-1 px-4 py-3">
                        <Link
                            href="/"
                            className={cn(
                                "flex h-[50px] items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
                                pathname === "/"
                                    ? "bg-white/[0.06] text-white"
                                    : "text-white/60 hover:bg-white/[0.03] hover:text-white"
                            )}
                        >
                            <LayoutDashboard
                                className="h-5 w-5"
                                strokeWidth={1.5}
                            />
                            Dashboard
                        </Link>

                        <Link
                            href="/groups"
                            className={cn(
                                "flex h-[50px] items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
                                pathname === "/groups"
                                    ? "bg-white/[0.06] text-white"
                                    : "text-white/60 hover:bg-white/[0.03] hover:text-white"
                            )}
                        >
                            <Users2 className="h-5 w-5" strokeWidth={1.5} />
                            Groups
                        </Link>

                        <Link
                            href="/friends"
                            className={cn(
                                "flex h-[50px] items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
                                pathname === "/friends"
                                    ? "bg-white/[0.06] text-white"
                                    : "text-white/60 hover:bg-white/[0.03] hover:text-white"
                            )}
                        >
                            <UserPlus className="h-5 w-5" strokeWidth={1.5} />
                            Friends
                        </Link>

                        <div className="my-4 border-t border-white/[0.02]" />

                        <Link
                            href="/settings"
                            className={cn(
                                "flex h-[50px] items-center gap-3 rounded-lg px-4 text-[15px] font-medium transition-colors",
                                pathname === "/settings"
                                    ? "bg-white/[0.06] text-white"
                                    : "text-white/60 hover:bg-white/[0.03] hover:text-white"
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
                                    <Users2
                                        className="h-5 w-5 text-white/40"
                                        strokeWidth={1.5}
                                    />
                                </div>
                                <div className="flex-1">

                                    <div className="text-xs text-white/40">
                                        Get started with Splito
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
