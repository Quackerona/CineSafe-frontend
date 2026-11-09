"use client";

import React, { useState, useEffect } from "react";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import NavRedirect from "@/components/NavRedirect";
import { storage } from "@/lib/storage";
import { FaCommentDots, FaFilm, FaUserGear, FaUser } from "react-icons/fa6";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [activeProfileName, setActiveProfileName] = useState("Alex");

  const updateHeaderProfile = () => {
    const user = storage.getUser();
    setActiveProfileName(user?.name || "Alex");
  };

  useEffect(() => {
    updateHeaderProfile();
    window.addEventListener("cinesafe_profile_switched", updateHeaderProfile);
    return () => {
      window.removeEventListener("cinesafe_profile_switched", updateHeaderProfile);
    };
  }, []);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="bg-[#f8f9ff] h-screen flex flex-col font-sans overflow-hidden">
        <header className="flex flex-wrap items-center justify-between px-6 py-3.5 bg-white border-b border-gray-200 shrink-0 gap-4">
          <Link href="/chatbot">
            <Image
              src="/cinesafe-logo.svg"
              alt="CineSafe logo"
              width={150}
              height={36}
              className="object-contain"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-3 py-1 bg-[#eff4ff] text-[#2a14b4] hover:bg-[#dce7ff] rounded-lg text-xs font-semibold transition"
              title="Click to view/switch profile"
            >
              <FaUser className="text-[10px]" />
              <span>{activeProfileName}</span>
            </Link>

            <nav className="bg-gray-100 flex rounded-xl p-1 text-sm gap-1">
              <NavRedirect label="Chatbot" href="/chatbot" icon={<FaCommentDots />} />
              <NavRedirect label="Library" href="/library" icon={<FaFilm />} />
              <NavRedirect label="Profile" href="/profile" icon={<FaUserGear />} />
            </nav>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</main>

        <footer className="bg-white border-t border-gray-200 flex flex-wrap items-center justify-between px-8 py-3.5 shrink-0 text-xs text-gray-500 gap-2">
          <h3>
            <span className="text-[#2a14b4] text-base font-bold">CineSafe</span> - Filtered & Secure Cinematic Experience
          </h3>
          <span className="text-gray-400">AI-powered phobia-aware content filtering</span>
        </footer>
      </body>
    </html>
  );
}
