import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  pgTableCreator,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ]
);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  role: text("role").$type<"USER" | "ANNOTATOR" | "ADMIN">().notNull().default("USER"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

// Volleyball annotation tables
export const videos = createTable(
  "video",
  (d) => ({
    id: d.uuid().primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: d.varchar({ length: 255 }).notNull(),
    cloudinaryFolder: d.varchar({ length: 512 }).notNull(),
    totalFrames: d.integer().notNull(),
    fps: d.integer().notNull().default(30),
    width: d.integer().notNull(),
    height: d.integer().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("video_name_idx").on(t.name),
    index("video_created_at_idx").on(t.createdAt),
  ]
);

export const annotations = createTable(
  "annotation",
  (d) => ({
    id: d.uuid().primaryKey().$defaultFn(() => crypto.randomUUID()),
    videoId: d
      .uuid()
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userId: d
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    frameNumber: d.integer().notNull(),
    x: d.real(), // Coordonnées relatives 0-1
    y: d.real(), // Coordonnées relatives 0-1
    ballVisible: d.boolean().notNull().default(true),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    unique("annotation_video_user_frame_unique").on(
      t.videoId,
      t.userId,
      t.frameNumber
    ),
    index("annotation_video_frame_idx").on(t.videoId, t.frameNumber),
    index("annotation_user_video_idx").on(t.userId, t.videoId),
    index("annotation_video_idx").on(t.videoId),
    index("annotation_user_idx").on(t.userId),
  ]
);

export const userVideoProgress = createTable(
  "user_video_progress",
  (d) => ({
    id: d.uuid().primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: d
      .uuid()
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    lastAnnotatedFrame: d.integer().notNull().default(-1),
    totalAnnotated: d.integer().notNull().default(0),
    status: d.varchar({ length: 50 }).notNull().default("in_progress"),
    startedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastActivity: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    completedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    unique("user_video_progress_unique").on(t.userId, t.videoId),
    index("user_video_progress_user_idx").on(t.userId),
    index("user_video_progress_video_idx").on(t.videoId),
    index("user_video_progress_status_idx").on(t.status),
    index("idx_user_role").on(t.userId), // For role filtering
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
  annotations: many(annotations),
  videoProgress: many(userVideoProgress),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const videosRelations = relations(videos, ({ many }) => ({
  annotations: many(annotations),
  userProgress: many(userVideoProgress),
}));

export const annotationsRelations = relations(annotations, ({ one }) => ({
  video: one(videos, {
    fields: [annotations.videoId],
    references: [videos.id],
  }),
  user: one(user, {
    fields: [annotations.userId],
    references: [user.id],
  }),
}));

export const userVideoProgressRelations = relations(
  userVideoProgress,
  ({ one }) => ({
    user: one(user, {
      fields: [userVideoProgress.userId],
      references: [user.id],
    }),
    video: one(videos, {
      fields: [userVideoProgress.videoId],
      references: [videos.id],
    }),
  })
);
