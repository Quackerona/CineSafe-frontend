import type { Metadata } from "next";
import "./globals.css";

import Image from "next/image";

import { FaRegUser, FaXTwitter } from "react-icons/fa6";

import NavRedirect from "@/components/NavRedirect";

export const metadata: Metadata = {
  title: "CineSafe AI",
  description: "Film recommendation AI system.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="bg-[#f8f9ff] min-h-full flex flex-col">
        <header className="grid grid-cols-2 md:grid-cols-3 p-3 items-center shadow-lg mb-7">
          <Image
            src="/cinesafe-logo.svg"
            alt="CineSafe logo"
            width={200}
            height={200}
            className="justify-self-start"
          />

          <nav className="hidden md:flex bg-[#eff4ff] rounded-xl pl-2 pr-2 pt-2 pb-2 text-lg gap-2 justify-self-center">
            <NavRedirect label="Chatbot" href="/chatbot" />
            <NavRedirect label="Thư viện phim" href="/library" />
          </nav>

          <FaRegUser className="text-white text-4xl rounded-xl bg-[#2a14b4] p-2.5 justify-self-end" />
        </header>

        <div className="grow">{children}</div>

        <footer className="bg-[#eff4ff] flex justify-between p-9">
          <div className="justify-self-start">
            <h2 className="text-base md:text-xl text-[#2a14b4] font-bold">CineSafe</h2>
            <h3 className="text-xs text-[#494856]">"Make entertainment entertaining again" - Ronald J. Hump</h3> {/*Placeholder*/}
          </div>
          <div className="justify-self-end text-center">
            <h2 className="text-base md:text-lg font-bold">Liên lạc</h2>
            <h3 className="text-xs text-[#494856]">Washington, D.C, White House</h3>
          </div>
        </footer>
      </body>
    </html>
  );
}
