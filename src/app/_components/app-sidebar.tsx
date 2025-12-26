"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  LogOut,
  ChevronUp,
  User2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ThemeToggle } from "~/components/theme-toggle";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = api.auth.getSession.useQuery();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <Sidebar>
      <SidebarContent>
        {/* App Header */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <div>
              <SidebarGroupLabel className="text-lg font-bold">
                Spike Track
              </SidebarGroupLabel>
              <p className="px-2 text-xs text-muted-foreground">
                Volleyball Annotation
              </p>
            </div>
            <ThemeToggle />
          </div>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    onClick={() => router.push(item.url)}
                  >
                    <a>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Videos Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Videos</SidebarGroupLabel>
          <SidebarGroupContent>
            <VideosList />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Info */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.image ?? undefined} />
                    <AvatarFallback>
                      {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{session?.user?.name || "User"}</span>
                    <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
                  </div>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function VideosList() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: progressData } = api.annotation.getMyProgress.useQuery();

  if (!progressData) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <p className="px-2 text-xs text-muted-foreground">Loading...</p>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const allVideos = [
    ...(progressData.current ? [progressData.current] : []),
    ...progressData.available.map((v) => ({
      videoId: v.id,
      videoName: v.name,
      percentComplete: 0,
    })),
  ];

  return (
    <SidebarMenu>
      {allVideos.length === 0 ? (
        <SidebarMenuItem>
          <p className="px-2 text-xs text-muted-foreground">No videos</p>
        </SidebarMenuItem>
      ) : (
        allVideos.map((video) => {
          const isActive = pathname === `/annotate/${video.videoId}`;
          return (
            <SidebarMenuItem key={video.videoId}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                onClick={() => router.push(`/annotate/${video.videoId}`)}
              >
                <a>
                  <Video className="h-4 w-4" />
                  <span className="truncate">{video.videoName}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })
      )}
    </SidebarMenu>
  );
}
