"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay.
          The z-indexes here are deliberately above Leaflet's own range rather
          than the z-40/z-50 pair they used to be. globals.css now isolates the
          map so its panes cannot escape, but map libraries are not the only
          thing on a page that reaches for a four-figure z-index, and a drawer
          that opens underneath the content is a bad failure to re-introduce. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[1200] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — always visible on lg+, slide-in on mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-[1300] transform transition-transform duration-200 ease-in-out lg:relative lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </>
  );
}
