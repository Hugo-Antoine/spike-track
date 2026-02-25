"use client";

import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

export function AnnotatorActivity() {
  const { data, isLoading } = api.stats.getAnnotatorActivity.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Aucun annotateur trouvé.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead className="w-24">Rôle</TableHead>
          <TableHead className="w-24 text-right">En cours</TableHead>
          <TableHead className="w-24 text-right">Terminées</TableHead>
          <TableHead className="w-24 text-right">Validées</TableHead>
          <TableHead className="w-28 text-right">Annotations</TableHead>
          <TableHead className="w-36 text-right">Dernière activité</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={a.image ?? undefined} alt={a.name} />
                  <AvatarFallback>
                    {a.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-muted-foreground text-xs">{a.email}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={a.role === "ADMIN" ? "default" : "secondary"}>
                {a.role}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{a.videosInProgress}</TableCell>
            <TableCell className="text-right">{a.videosCompleted}</TableCell>
            <TableCell className="text-right">{a.videosValidated}</TableCell>
            <TableCell className="text-right">
              {a.totalAnnotations.toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-sm">
              {a.lastActivity
                ? new Date(a.lastActivity).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
