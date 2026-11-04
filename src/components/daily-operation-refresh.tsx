"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DailyOperationRefresh() {
  const router = useRouter();
  useEffect(() => {
    const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    let day = localDate();
    const check = () => { const current = localDate(); if (current !== day) { day = current; router.refresh(); } };
    const timer = window.setInterval(check, 15000);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [router]);
  return null;
}
