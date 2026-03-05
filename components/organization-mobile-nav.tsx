"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, TrendingUp, Activity, FileSignature, Users, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { A } from "@/lib/splito-design";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";

// 6 tabs: Dashboard first, then Invoices, Streams, Activity, Contracts, Members
const DASHBOARD_TAB = { key: "dashboard", label: "Dashboard", path: "dashboard", icon: LayoutDashboard };
const ORG_NAV_ITEMS = [
  { key: "invoices", label: "Invoices", path: "invoices", icon: FileText },
  { key: "streams", label: "Streams", path: "streams", icon: TrendingUp },
  { key: "activity", label: "Activity", path: "activity", icon: Activity },
  { key: "contracts", label: "Contracts", path: "contracts", icon: FileSignature },
  { key: "members", label: "Members", path: "members", icon: Users },
] as const;
const ALL_TABS = [DASHBOARD_TAB, ...ORG_NAV_ITEMS];

// Match /organization/:id or /app/organization/:id (first segment after organization)
const ORG_ID_FROM_PATH = /\/organization\/([^/]+)(?:\/|$)/;
const RESERVED_SEGMENTS = new Set(["roles", "create", "organizations", "settings", "members"]);

export function OrganizationMobileNav() {
  const pathname = usePathname();
  const { data: organizations = [] } = useGetAllOrganizations({
    enabled: pathname?.includes("/organization") ?? false,
  });

  if (!pathname?.includes("/organization")) {
    return null;
  }

  const match = pathname.match(ORG_ID_FROM_PATH);
  const firstSegment = match?.[1];
  const organizationId = firstSegment && !RESERVED_SEGMENTS.has(firstSegment) ? firstSegment : null;
  const basePath = pathname.startsWith("/app") ? "/app/organization" : "/organization";
  const firstOrgId = organizations[0]?.id ?? null;
  const effectiveOrgId = organizationId ?? firstOrgId;

  const isActive = (path: string) => {
    if (path === "dashboard") return pathname === basePath;
    if (!effectiveOrgId) return false;
    const segment = `${basePath}/${effectiveOrgId}/${path}`;
    return pathname === segment || pathname.startsWith(segment + "/");
  };

  const getHref = (path: string) => {
    if (path === "dashboard") return basePath;
    if (!effectiveOrgId) return basePath;
    return `${basePath}/${effectiveOrgId}/${path}`;
  };

  const navStyle = {
    background: "rgba(10,10,10,0.97)",
    backdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    padding: "8px 4px 20px",
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 min-[1025px]:hidden"
      style={navStyle}
    >
      <div className="flex justify-around gap-0">
        {ALL_TABS.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const href = getHref(item.path);
          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1 transition-all duration-200 font-[inherit] no-underline",
                active ? "text-[#22D3EE]" : "text-white/40"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-[10px] transition-all duration-200",
                  active && "bg-[#22D3EE]/20"
                )}
              >
                <Icon
                  className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] shrink-0"
                  strokeWidth={active ? 2.2 : 1.8}
                  style={{ color: active ? A : "inherit" }}
                />
              </div>
              <span
                className={cn(
                  "text-[8px] sm:text-[10px] font-medium truncate max-w-full px-0.5",
                  active && "font-bold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
