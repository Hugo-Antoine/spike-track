"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Shield,
  Video,
  LogOut,
  ChevronUp,
} from "lucide-react";
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
  const { data: progress } = api.annotation.getMyProgress.useQuery(
    undefined,
    {
      enabled: session?.user.role === "ANNOTATOR" || session?.user.role === "ADMIN",
    }
  );

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  // Pour USER, sidebar minimale
  if (session?.user.role === "USER") {
    return (
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6" />
            <span className="font-semibold">Spike Track</span>
          </div>
        </SidebarHeader>
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <UserMenu user={session.user} onLogout={handleLogout} />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // Pour ANNOTATOR et ADMIN
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
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

              {session?.user.role === "ADMIN" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/admin"}
                    onClick={() => router.push("/admin")}
                  >
                    <a>
                      <Shield className="h-4 w-4" />
                      <span>Gestion utilisateurs</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {progress && (progress.current || progress.available.length > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>Vidéos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {progress.current && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/annotate/${progress.current.videoId}`}
                      onClick={() => router.push(`/annotate/${progress.current.videoId}`)}
                    >
                      <a>
                        <Video className="h-4 w-4" />
                        <span className="truncate">
                          {progress.current.videoName}
                        </span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {progress.available.slice(0, 5).map((video) => (
                  <SidebarMenuItem key={video.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/annotate/${video.id}`}
                      onClick={() => router.push(`/annotate/${video.id}`)}
                    >
                      <a>
                        <Video className="h-4 w-4" />
                        <span className="truncate">{video.name}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
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

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden text-left text-sm leading-none">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
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
              className="cursor-pointer text-destructive focus:text-destructive"
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
