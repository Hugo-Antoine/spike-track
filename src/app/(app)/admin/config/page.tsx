"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import { useToast } from "~/hooks/use-toast";
import { Settings2 } from "lucide-react";

export default function AdminConfigPage() {
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: queueConfig, isLoading } = api.admin.getQueueConfig.useQuery();

  const [reannotationPct, setReannotationPct] = useState(30);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (queueConfig) {
      setReannotationPct(queueConfig.reannotationPercentage);
    }
  }, [queueConfig]);

  const updateConfig = api.admin.updateQueueConfig.useMutation({
    onSuccess: async () => {
      toast({
        title: "Configuration sauvegardée",
        description: `Re-annotation à ${reannotationPct}%`,
      });
      setIsDirty(false);
      await utils.admin.getQueueConfig.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Configuration de la queue
        </CardTitle>
        <CardDescription>
          Définissez le pourcentage de vidéos assignées en re-annotation
          (validation croisée entre annotateurs).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>{100 - reannotationPct}% nouvelles vidéos</span>
            <span>{reannotationPct}% re-annotations</span>
          </div>
          <Slider
            value={[reannotationPct]}
            onValueChange={([value]) => {
              setReannotationPct(value!);
              setIsDirty(true);
            }}
            min={0}
            max={100}
            step={5}
          />
          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateConfig.mutate({
                  reannotationPercentage: reannotationPct,
                })
              }
              disabled={!isDirty || updateConfig.isPending}
            >
              {updateConfig.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
