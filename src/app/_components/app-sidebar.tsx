"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Video,
  LogOut,
  ChevronUp,
  Film,
  Cpu,
  Users,
  Database,
  Settings2,
} from "lucide-react";
import type { Permission } from "~/lib/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ThemeToggle } from "~/components/theme-toggle";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = api.auth.getSession.useQuery();

  const hasPerm = (perm: Permission) => {
    if (!session) return false;
    if (session.user.role === "ADMIN") return true;
    return session.user.permissions.includes(perm);
  };

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  // Pour USER, sidebar minimale
  if (session?.user.role === "USER") {
    return (
      <Sidebar>
        <SidebarHeader className="border-sidebar-border border-b p-4">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6" />
            <span className="font-semibold">Spike Track</span>
          </div>
        </SidebarHeader>
        <SidebarFooter className="border-sidebar-border border-t p-4">
          <UserMenu user={session.user} onLogout={handleLogout} />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // Pour ANNOTATOR et ADMIN
  return (
    <Sidebar>
      <SidebarHeader className="border-sidebar-border border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6" />
            <span className="font-semibold">Spike Track</span>
          </div>
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  onClick={() => router.push("/dashboard")}
                >
                  <a>
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {hasPerm("video:list_sources") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/video-management")}
                    onClick={() => router.push("/video-management")}
                  >
                    <a>
                      <Film className="h-4 w-4" />
                      <span>Gestion vidéos</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasPerm("video:view_processing") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/processing"}
                    onClick={() => router.push("/processing")}
                  >
                    <a>
                      <Cpu className="h-4 w-4" />
                      <span>Traitement</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasPerm("admin:view_users") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/admin/users"}
                    onClick={() => router.push("/admin/users")}
                  >
                    <a>
                      <Users className="h-4 w-4" />
                      <span>Utilisateurs</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasPerm("admin:manage_config") && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/admin/data"}
                      onClick={() => router.push("/admin/data")}
                    >
                      <a>
                        <Database className="h-4 w-4" />
                        <span>Données</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/admin/config"}
                      onClick={() => router.push("/admin/config")}
                    >
                      <a>
                        <Settings2 className="h-4 w-4" />
                        <span>Configuration</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t p-4">
        <UserMenu user={session?.user} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}

interface UserMenuProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onLogout: () => void;
}

function UserMenu({ user, onLogout }: UserMenuProps) {
  if (!user) return null;

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={user.image ?? undefined}
                  alt={user.name ?? undefined}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden text-left text-sm leading-none">
                <p className="truncate font-medium">{user.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              </div>
              <ChevronUp className="ml-auto h-4 w-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" side="top">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={onLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Se déconnecter</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
