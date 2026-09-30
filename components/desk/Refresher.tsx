"use client";

/**
 * Refresher — keeps a server-rendered screen live while wallets are being read.
 * The desk's worker attributes filed wallets in the background, so while any
 * are pending the page asks Next to re-render its server components every 3
 * seconds (`router.refresh()`), and stops the moment nothing is pending. It
 * pauses while the tab is hidden and draws nothing itself.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function Refresher({ active, every = 3000 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, every);
    return () => clearInterval(timer);
  }, [active, every, router]);
  return null;
}
