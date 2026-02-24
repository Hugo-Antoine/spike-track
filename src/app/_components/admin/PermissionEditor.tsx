"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useToast } from "~/hooks/use-toast";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_TEMPLATES,
  type Permission,
} from "~/lib/permissions";

interface PermissionEditorProps {
  userId: string;
  userName: string;
  initialPermissions: string[];
  onClose: () => void;
}

export function PermissionEditor({
  userId,
  userName,
  initialPermissions,
  onClose,
}: PermissionEditorProps) {
  const { toast } = useToast();
  const utils = api.useUtils();
  const [permissions, setPermissions] = useState<Set<string>>(
    new Set(initialPermissions),
  );

  const updatePermissions = api.admin.updateUserPermissions.useMutation({
    onSuccess: async () => {
      toast({
        title: "Permissions mises à jour",
        description: `Permissions de ${userName} sauvegardées.`,
      });
      await utils.admin.getAllUsers.invalidate();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggle = (permission: Permission) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  };

  const applyTemplate = (templateKey: string) => {
    const template = ROLE_TEMPLATES[templateKey];
    if (template) {
      setPermissions(new Set(template.permissions));
    }
  };

  const clearAll = () => setPermissions(new Set());

  const handleSave = () => {
    updatePermissions.mutate({
      userId,
      permissions: Array.from(permissions),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Permissions de {userName}</CardTitle>
        <CardDescription>
          Cochez les permissions individuelles ou appliquez un template.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => applyTemplate(key)}
            >
              {tmpl.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={clearAll}>
            Aucune
          </Button>
        </div>

        <div className="space-y-4">
          {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
            <div key={group}>
              <h4 className="mb-2 text-sm font-medium">{group}</h4>
              <div className="space-y-2">
                {perms.map((perm) => (
                  <label key={perm} className="flex items-center gap-3">
                    <Checkbox
                      checked={permissions.has(perm)}
                      onCheckedChange={() => toggle(perm)}
                    />
                    <span className="text-sm">{PERMISSION_LABELS[perm]}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {perm}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updatePermissions.isPending}
          >
            {updatePermissions.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
