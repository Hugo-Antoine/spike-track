"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Film, Users, Settings2 } from "lucide-react";
import { cn } from "~/lib/utils";

const adminNav = [
  { href: "/admin/video-management", label: "Vidéos", icon: Film },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/config", label: "Configuration", icon: Settings2 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          <Shield className="text-primary h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold">Administration</h1>
      </div>

      <nav className="mb-6 flex gap-1 border-b">
        {adminNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "text-muted-foreground hover:text-foreground flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(href) && "border-primary text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
