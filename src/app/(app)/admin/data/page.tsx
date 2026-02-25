"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { GlobalStats } from "~/app/_components/admin/data/GlobalStats";
import { MatchesTable } from "~/app/_components/admin/data/MatchesTable";
import { AnnotatorActivity } from "~/app/_components/admin/data/AnnotatorActivity";

export default function AdminDataPage() {
  return (
    <div className="space-y-6">
      <GlobalStats />

      <Tabs defaultValue="matches">
        <TabsList>
          <TabsTrigger value="matches">Matchs</TabsTrigger>
          <TabsTrigger value="annotators">Annotateurs</TabsTrigger>
        </TabsList>
        <TabsContent value="matches" className="mt-4">
          <MatchesTable />
        </TabsContent>
        <TabsContent value="annotators" className="mt-4">
          <AnnotatorActivity />
        </TabsContent>
      </Tabs>
    </div>
  );
}
