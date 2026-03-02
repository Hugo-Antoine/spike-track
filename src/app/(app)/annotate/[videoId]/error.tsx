"use client";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AnnotateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertCircle className="text-destructive mx-auto mb-2 h-10 w-10" />
          <CardTitle>Erreur d&apos;annotation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            {error.message || "Impossible de charger la page d'annotation."}
          </p>
          {error.digest && (
            <p className="text-muted-foreground text-xs">
              Référence : {error.digest}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard">Retour au dashboard</Link>
            </Button>
            <Button onClick={reset}>Réessayer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
