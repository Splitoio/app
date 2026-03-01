"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, UserCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

type User = { id: string; name: string | null; email: string | null; image: string | null };

const defaultDropdownClassName =
  "absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#101012] border border-white/10 shadow-xl py-2 z-[100]";

export function ProfileDropdown({
  user,
  profileHref,
  avatarSizeClass = "h-9 w-9 sm:h-12 sm:w-12",
  dropdownClassName = defaultDropdownClassName,
}: {
  user: User;
  profileHref: string;
  avatarSizeClass?: string;
  dropdownClassName?: string;
}) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push("/login");
  };

  const itemClass =
    "flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:bg-white/[0.06] transition-colors";

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={() => setDropdownOpen(true)}
      onMouseLeave={() => setDropdownOpen(false)}
    >
      <button
        type="button"
        onClick={() => setDropdownOpen((o) => !o)}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label="Account menu"
        aria-expanded={dropdownOpen}
      >
        <div className={`overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5 ${avatarSizeClass}`}>
          <div className="h-full w-full rounded-full overflow-hidden bg-[#101012]">
            {user.image ? (
              <Image
                src={user.image}
                alt="Profile"
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={`https://api.dicebear.com/9.x/identicon/svg?seed=${user.id || user.email}`}
                alt="Profile"
                width={56}
                height={56}
                className="h-full w-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=user`;
                }}
              />
            )}
          </div>
        </div>
      </button>

      {dropdownOpen && (
        <div className={dropdownClassName}>
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm text-white/60 truncate" title={user.email ?? undefined}>
              {user.email ?? ""}
            </p>
          </div>
          <Link
            href={profileHref}
            onClick={() => setDropdownOpen(false)}
            className={itemClass}
          >
            <UserCircle className="h-4 w-4 text-white/50" strokeWidth={1.5} />
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full text-left ${itemClass}`}
          >
            <LogOut className="h-4 w-4 text-white/50" strokeWidth={1.5} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
