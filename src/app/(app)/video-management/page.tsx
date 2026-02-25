"use client";

import { Film } from "lucide-react";
import { VideoImporter } from "~/app/_components/admin/VideoImporter";

export default function VideoManagementPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          <Film className="text-primary h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold">Gestion vidéos</h1>
      </div>

      <VideoImporter />
    </div>
  );
}
