"use client";

import { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function AnimatedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <div key={pathname} className="w-full h-full">
        {children}
      </div>
    </AnimatePresence>
  );
} 