"use client";

import { usePathname } from "next/navigation";

export function PageTitle() {
  const pathname = usePathname();
  const title = pathname.split("/")[1];
  const isHomePage = pathname === "/";

  return (
    <h1
      className={`text-display text-white capitalize inline-block ${
        isHomePage ? "mb-8" : ""
      }`}
    >
      {title || "Overview"}
    </h1>
  );
}
