import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import MobileLayout from "@/components/layout/MobileLayout";
import { FilterProvider } from "@/lib/filter-context";

export const metadata: Metadata = {
  title: "मतदान iQ - India's Booth-Level Voter Intelligence Platform",
  description: "India's Booth-Level Voter Intelligence Platform | matdaaniq.com",
  icons: { icon: "/icon.svg" },
};

// Attributes that browser extensions stamp onto elements they inspect. None of
// these come from this app or from any library it uses, so removing them is
// always safe. Bitdefender's bis_* attributes are the ones that actually bite
// here: they land on arbitrary <div>s deep in the tree, where
// suppressHydrationWarning cannot reach (it only covers the element it is set
// on), so React sees an attribute it never rendered and reports a hydration
// mismatch on every load.
const EXTENSION_ATTRS = [
  "bis_skin_checked", "bis_size", "bis_id",          // Bitdefender
  "data-gr-ext-installed", "data-new-gr-c-s-check-loaded",
  "data-gramm", "data-gramm_editor",                 // Grammarly
  "cz-shortcut-listen",                              // ColorZilla
  "data-lt-installed",                               // LanguageTool
];

// Runs as the document parses, before React hydrates, and keeps running until
// shortly after load so it also catches extensions that stamp late. It only
// ever removes the attributes listed above — a genuine hydration mismatch in
// our own markup is untouched and still reported.
const STRIP_EXTENSION_ATTRS = `
(function () {
  var A = ${JSON.stringify(EXTENSION_ATTRS)};
  function scrub(node) {
    if (!node || node.nodeType !== 1) return;
    for (var i = 0; i < A.length; i++) {
      if (node.hasAttribute && node.hasAttribute(A[i])) node.removeAttribute(A[i]);
    }
    if (node.querySelectorAll) {
      var found = node.querySelectorAll(A.map(function (a) { return "[" + a + "]"; }).join(","));
      for (var j = 0; j < found.length; j++) {
        for (var k = 0; k < A.length; k++) found[j].removeAttribute(A[k]);
      }
    }
  }
  try { scrub(document.documentElement); } catch (e) {}
  if (typeof MutationObserver !== "function") return;
  var obs = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === "attributes") {
        if (r.target.removeAttribute) r.target.removeAttribute(r.attributeName);
      } else {
        for (var j = 0; j < r.addedNodes.length; j++) scrub(r.addedNodes[j]);
      }
    }
  });
  try {
    obs.observe(document.documentElement, {
      subtree: true, childList: true, attributes: true, attributeFilter: A,
    });
  } catch (e) { return; }
  // Hydration is long done by then; stop observing so we are not fighting the
  // extension for the life of the page.
  window.addEventListener("load", function () {
    setTimeout(function () { obs.disconnect(); }, 5000);
  });
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning here matches what <body> already does: browser
    // extensions (password managers, Grammarly, dark-mode and translate tools)
    // add attributes to <html> and <body> before React hydrates, which React
    // then reports as an attribute mismatch. It only covers attributes on this
    // element itself, not anything rendered inside the app.
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Must be the first script in <head>: it has to run before the page
            body parses so extension attributes are gone by hydration time. */}
        <script dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS }} />
        <meta name="robots" content="all, follow" />
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
