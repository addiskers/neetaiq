import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import MobileLayout from "@/components/layout/MobileLayout";
import { FilterProvider } from "@/lib/filter-context";

export const metadata: Metadata = {
  title: "मतदान iQ — India's Booth-Level Voter Intelligence Platform",
  description: "India's Booth-Level Voter Intelligence Platform | matdaaniq.com",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <Script id="clarity" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "wimlw8v3qq");
        `}</Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-KLTMBMGT8E" strategy="afterInteractive" />
        <Script id="gtag" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-KLTMBMGT8E');
        `}</Script>
      </head>
      <body suppressHydrationWarning className="h-screen flex overflow-hidden bg-[#F7F8FC]">
        <FilterProvider>
          <MobileLayout>{children}</MobileLayout>
        </FilterProvider>
      </body>
    </html>
  );
}
