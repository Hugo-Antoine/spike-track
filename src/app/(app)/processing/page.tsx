"use client";

import { Cpu } from "lucide-react";
import { BatchProcessing } from "~/app/_components/admin/BatchProcessing";

export default function ProcessingPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          <Cpu className="text-primary h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold">Traitement</h1>
      </div>

      <BatchProcessing />
    </div>
  );
}
