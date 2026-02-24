"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useToast } from "~/hooks/use-toast";
import { Shield, Users, Settings2, Film, Cpu, KeyRound } from "lucide-react";
import { VideoImporter } from "~/app/_components/admin/VideoImporter";
import { BatchProcessing } from "~/app/_components/admin/BatchProcessing";
import { PermissionEditor } from "~/app/_components/admin/PermissionEditor";

export default function AdminPage() {
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: users, isLoading } = api.admin.getAllUsers.useQuery();
  const { data: queueConfig, isLoading: isConfigLoading } =
    api.admin.getQueueConfig.useQuery();

  const [reannotationPct, setReannotationPct] = useState(30);
  const [isDirty, setIsDirty] = useState(false);
  const [editingPermissionsFor, setEditingPermissionsFor] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (queueConfig) {
      setReannotationPct(queueConfig.reannotationPercentage);
    }
  }, [queueConfig]);

  const updateRole = api.admin.updateUserRole.useMutation({
    onSuccess: async () => {
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle de l'utilisateur a été modifié avec succès",
      });
      await utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "default";
      case "ANNOTATOR":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading || isConfigLoading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="mb-8 h-12 w-64" />
        <Skeleton className="mb-8 h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const editingUser = editingPermissionsFor
    ? users?.find((u) => u.id === editingPermissionsFor)
    : null;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
          <Shield className="text-primary h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="text-muted-foreground">
            Gérez la configuration, les utilisateurs et les vidéos
          </p>
        </div>
      </div>

      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="videos" className="gap-2">
            <Film className="h-4 w-4" />
            Import vidéo
          </TabsTrigger>
          <TabsTrigger value="processing" className="gap-2">
            <Cpu className="h-4 w-4" />
            Traitement
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Video Import Tab */}
        <TabsContent value="videos">
          <VideoImporter />
        </TabsContent>

        {/* Processing Tab */}
        <TabsContent value="processing">
          <BatchProcessing />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Utilisateurs ({users?.length ?? 0})
              </CardTitle>
              <CardDescription>
                Changez les rôles entre USER et ANNOTATOR. Cliquez sur
                &quot;Permissions&quot; pour configurer les accès granulaires.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>
                        {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {u.role === "ADMIN" ? (
                          <Badge variant={getRoleBadgeVariant(u.role)}>
                            {u.role}
                          </Badge>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(value: "USER" | "ANNOTATOR") => {
                              updateRole.mutate({
                                userId: u.id,
                                role: value,
                              });
                            }}
                            disabled={updateRole.isPending}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">USER</SelectItem>
                              <SelectItem value="ANNOTATOR">
                                ANNOTATOR
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.role === "ADMIN" ? (
                          <Badge variant="default">Toutes</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPermissionsFor(u.id)}
                          >
                            <KeyRound className="mr-1 h-3 w-3" />
                            {u.permissions.length > 0
                              ? `${u.permissions.length} permission${u.permissions.length > 1 ? "s" : ""}`
                              : "Par défaut"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {editingUser && (
            <div className="mt-4">
              <PermissionEditor
                userId={editingUser.id}
                userName={editingUser.name}
                initialPermissions={editingUser.permissions}
                onClose={() => setEditingPermissionsFor(null)}
              />
            </div>
          )}
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
