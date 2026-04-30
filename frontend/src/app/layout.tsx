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
        <meta name="google-site-verification" content="6AIdlgWvny6elAPBIivuCf5qy0vePr9M5_ptaS_4b2I" />
        <Script id="gtm" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-KGD96WFD');
        `}</Script>
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
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KGD96WFD" height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe></noscript>
        <FilterProvider>
          <MobileLayout>{children}</MobileLayout>
        </FilterProvider>
      </body>
    </html>
  );
}
