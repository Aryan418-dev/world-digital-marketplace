"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Nav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/map", label: "Map" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <header className="nav">
      <Link href="/" className="logo">
        WORLD
      </Link>
      <nav className="nav-links">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? "active" : ""}
          >
            {l.label}
          </Link>
        ))}
        {email ? (
          <Link href="/dashboard" className="btn btn-ghost" style={{ padding: "0.4rem 0.9rem" }}>
            {email.split("@")[0]}
          </Link>
        ) : (
          <Link href="/login" className="btn btn-primary" style={{ padding: "0.4rem 0.9rem" }}>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
