import type { Metadata } from "next";
import "./globals.css";
import MobileLayout from "@/components/layout/MobileLayout";
import { FilterProvider } from "@/lib/filter-context";

export const metadata: Metadata = {
  title: "मतदान iQ — India's Booth-Level Voter Intelligence Platform",
  description: "India's Booth-Level Voter Intelligence Platform | matdaaniq.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body suppressHydrationWarning className="h-screen flex overflow-hidden bg-[#F7F8FC]">
        <FilterProvider>
          <MobileLayout>{children}</MobileLayout>
        </FilterProvider>
      </body>
    </html>
  );
}
