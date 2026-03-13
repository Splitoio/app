"use client";

import { Instrument_Sans, DM_Sans, DM_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { MobileMenuToggle } from "@/components/mobile-menu-toggle";
import { MobileMenuProvider } from "@/contexts/mobile-menu";
import "./globals.css";
import { Providers } from "@/components/providers";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { OnboardingGate } from "@/components/onboarding-gate";
import { PersonalMobileNav } from "@/components/personal-mobile-nav";
import { OrganizationMobileNav } from "@/components/organization-mobile-nav";
import { MobileFAB } from "@/components/mobile-fab";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname?.match(/^\/login|^\/signup/);
  const isOrganizationMode = pathname?.includes("/organization");
  const isPersonalMode = !isOrganizationMode;

  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className={instrumentSans.className}>
        <MobileMenuProvider>
          <Providers>
            {isAuthPage ? (
              children
            ) : (
              <div className="min-h-screen bg-[#0b0b0b] splito-page-wrap">
                <OnboardingGate />
                <Sidebar />
                <MobileMenuToggle />
                {isPersonalMode && <PersonalMobileNav />}
                {isOrganizationMode && <OrganizationMobileNav />}
                {isPersonalMode && <MobileFAB />}
                <div className="min-[1025px]:pl-[226px] min-h-screen flex flex-col">
                  <main className="flex-1 bg-[#0b0b0b] min-h-screen relative flex flex-col min-w-0">
                    <div
                      className={cn(
                        "w-full flex-1 flex flex-col min-w-0",
                        "max-[1024px]:max-w-[430px] max-[1024px]:mx-auto max-[1024px]:pb-[88px]"
                      )}
                    >
                      {children}
                    </div>
                  </main>
                </div>
              </div>
            )}
          </Providers>
        </MobileMenuProvider>
        <Toaster position="top-right" theme="dark" />
      </body>
    </html>
  );
}
