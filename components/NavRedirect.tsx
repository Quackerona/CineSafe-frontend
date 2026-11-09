"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavRedirectProps {
  label: string;
  href: string;
  icon?: ReactNode;
}

export default function NavRedirect({ label, href, icon }: NavRedirectProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-nowrap transition text-xs font-medium ${
        isActive
          ? "bg-white text-[#2a14b4] shadow-2xs font-semibold"
          : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
