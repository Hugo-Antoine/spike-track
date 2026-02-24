"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Film, Cpu } from "lucide-react";
import { VideoImporter } from "~/app/_components/admin/VideoImporter";
import { BatchProcessing } from "~/app/_components/admin/BatchProcessing";

export default function AdminVideosPage() {
  return (
    <Tabs defaultValue="import" className="space-y-6">
      <TabsList>
        <TabsTrigger value="import" className="gap-2">
          <Film className="h-4 w-4" />
          Import & découpage
        </TabsTrigger>
        <TabsTrigger value="processing" className="gap-2">
          <Cpu className="h-4 w-4" />
          Traitement
        </TabsTrigger>
      </TabsList>

      <TabsContent value="import">
        <VideoImporter />
      </TabsContent>

      <TabsContent value="processing">
        <BatchProcessing />
      </TabsContent>
    </Tabs>
  );
}
