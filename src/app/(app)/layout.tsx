import { SidebarProvider, SidebarInset, SidebarTrigger } from "~/components/ui/sidebar";
import { AppSidebar } from "~/app/_components/app-sidebar";
import { ThemeToggle } from "~/components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <SidebarTrigger />
          <ThemeToggle />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
