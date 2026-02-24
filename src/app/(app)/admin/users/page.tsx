"use client";

import { useState } from "react";
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
import { useToast } from "~/hooks/use-toast";
import { Users, KeyRound } from "lucide-react";
import { PermissionEditor } from "~/app/_components/admin/PermissionEditor";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: users, isLoading } = api.admin.getAllUsers.useQuery();
  const [editingPermissionsFor, setEditingPermissionsFor] = useState<
    string | null
  >(null);

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const editingUser = editingPermissionsFor
    ? users?.find((u) => u.id === editingPermissionsFor)
    : null;

  return (
    <div className="space-y-4">
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
                          <SelectItem value="ANNOTATOR">ANNOTATOR</SelectItem>
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
        <PermissionEditor
          userId={editingUser.id}
          userName={editingUser.name}
          initialPermissions={editingUser.permissions}
          onClose={() => setEditingPermissionsFor(null)}
        />
      )}
    </div>
  );
}
