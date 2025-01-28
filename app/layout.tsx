import { Instrument_Sans } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MobileMenuProvider } from "@/contexts/mobile-menu";
import "./globals.css";
import { Providers } from "@/components/providers";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={instrumentSans.className}>
        <MobileMenuProvider>
          <Providers>
            <div className="min-h-screen bg-[#101012]">
              <Sidebar />
              <div className="min-[1025px]:pl-[280px] min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 mt-[110px] bg-zinc-950 p-4 min-[1025px]:p-8 min-[1025px]:rounded-tl-[24px] relative">
                  <div className="absolute top-0 left-0 w-[50px] h-[110px] bg-[#101012] min-[1025px]:rounded-tr-[50px] -z-10" />
                  <div className="w-full">{children}</div>
                </main>
              </div>
            </div>
          </Providers>
        </MobileMenuProvider>
      </body>
    </html>
  );
}
