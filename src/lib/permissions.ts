export const PERMISSIONS = [
  // Video
  "video:upload",
  "video:create_source",
  "video:list_sources",
  "video:delete_source",
  "video:create_segments",
  "video:launch_processing",
  "video:view_processing",
  // Annotation
  "annotation:annotate",
  "annotation:view_own",
  "annotation:validate",
  // Admin
  "admin:view_users",
  "admin:manage_roles",
  "admin:manage_config",
  // Queue
  "queue:request_video",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "video:upload": "Upload vidéos sources vers S3",
  "video:create_source": "Créer enregistrements source en DB",
  "video:list_sources": "Voir toutes les sources",
  "video:delete_source": "Supprimer des sources",
  "video:create_segments": "Définir/sauvegarder des segments",
  "video:launch_processing": "Lancer le traitement Lambda",
  "video:view_processing": "Voir le statut de traitement",
  "annotation:annotate": "Créer/modifier des annotations",
  "annotation:view_own": "Voir ses propres annotations",
  "annotation:validate": "Valider/verrouiller les annotations",
  "admin:view_users": "Voir tous les utilisateurs",
  "admin:manage_roles": "Gérer rôles et permissions",
  "admin:manage_config": "Modifier config queue",
  "queue:request_video": "Demander la prochaine vidéo",
};

export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  Vidéo: [
    "video:upload",
    "video:create_source",
    "video:list_sources",
    "video:delete_source",
    "video:create_segments",
    "video:launch_processing",
    "video:view_processing",
  ],
  Annotation: [
    "annotation:annotate",
    "annotation:view_own",
    "annotation:validate",
  ],
  Administration: [
    "admin:view_users",
    "admin:manage_roles",
    "admin:manage_config",
  ],
  Queue: ["queue:request_video"],
};

export const ROLE_TEMPLATES: Record<
  string,
  { label: string; permissions: Permission[] }
> = {
  annotator: {
    label: "Annotateur",
    permissions: [
      "annotation:annotate",
      "annotation:view_own",
      "queue:request_video",
    ],
  },
  video_manager: {
    label: "Gestionnaire vidéo",
    permissions: [
      "video:upload",
      "video:create_source",
      "video:list_sources",
      "video:delete_source",
      "video:create_segments",
      "video:launch_processing",
      "video:view_processing",
    ],
  },
  full_access: {
    label: "Accès complet",
    permissions: [...PERMISSIONS],
  },
};
