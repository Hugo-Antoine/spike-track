import { pgTable, index, foreignKey, uuid, varchar, real, integer, timestamp, text, unique, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const pgDrizzleVideo = pgTable("pg-drizzle_video", {
	id: uuid().primaryKey().notNull(),
	sourceVideoId: uuid(),
	name: varchar({ length: 255 }).notNull(),
	cloudinaryPublicId: varchar({ length: 512 }),
	s3FramesPrefix: varchar({ length: 512 }),
	startTimeSeconds: real("start_time_seconds"),
	totalFrames: integer().notNull(),
	fps: integer().default(30).notNull(),
	width: integer().notNull(),
	height: integer().notNull(),
	status: varchar({ length: 50 }).default('ready').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }),
	endTimeSeconds: real("end_time_seconds"),
	processedFrames: integer().default(0).notNull(),
}, (table) => [
	index("video_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("video_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("video_source_idx").using("btree", table.sourceVideoId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sourceVideoId],
			foreignColumns: [pgDrizzleSourceVideo.id],
			name: "pg-drizzle_video_sourceVideoId_pg-drizzle_source_video_id_fk"
		}).onDelete("set null"),
]);

export const pgDrizzlePost = pgTable("pg-drizzle_post", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""pg-drizzle_post_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	name: varchar({ length: 256 }),
	createdById: varchar({ length: 255 }).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("created_by_idx").using("btree", table.createdById.asc().nullsLast().op("text_ops")),
	index("name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdById],
			foreignColumns: [user.id],
			name: "pg-drizzle_post_createdById_user_id_fk"
		}),
]);

export const pgDrizzleQueueConfig = pgTable("pg-drizzle_queue_config", {
	id: uuid().primaryKey().notNull(),
	reannotationPercentage: integer().default(30).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }),
	updatedBy: text(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [user.id],
			name: "pg-drizzle_queue_config_updatedBy_user_id_fk"
		}).onDelete("set null"),
]);

export const pgDrizzleUserVideoProgress = pgTable("pg-drizzle_user_video_progress", {
	id: uuid().primaryKey().notNull(),
	userId: text().notNull(),
	videoId: uuid().notNull(),
	lastAnnotatedFrame: integer().default(0).notNull(),
	totalAnnotated: integer().default(0).notNull(),
	status: varchar({ length: 50 }).default('in_progress').notNull(),
	startedAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	lastActivity: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	completedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_user_role").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("user_video_progress_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("user_video_progress_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("user_video_progress_video_idx").using("btree", table.videoId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "pg-drizzle_user_video_progress_userId_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.videoId],
			foreignColumns: [pgDrizzleVideo.id],
			name: "pg-drizzle_user_video_progress_videoId_pg-drizzle_video_id_fk"
		}).onDelete("cascade"),
	unique("user_video_progress_unique").on(table.videoId, table.userId),
]);

export const pgDrizzleAnnotation = pgTable("pg-drizzle_annotation", {
	id: uuid().primaryKey().notNull(),
	videoId: uuid().notNull(),
	userId: text().notNull(),
	frameNumber: integer().notNull(),
	x: real(),
	y: real(),
	ballVisible: boolean().default(true).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("annotation_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("annotation_user_video_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.videoId.asc().nullsLast().op("uuid_ops")),
	index("annotation_video_frame_idx").using("btree", table.videoId.asc().nullsLast().op("int4_ops"), table.frameNumber.asc().nullsLast().op("uuid_ops")),
	index("annotation_video_idx").using("btree", table.videoId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.videoId],
			foreignColumns: [pgDrizzleVideo.id],
			name: "pg-drizzle_annotation_videoId_pg-drizzle_video_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "pg-drizzle_annotation_userId_user_id_fk"
		}).onDelete("cascade"),
	unique("annotation_video_user_frame_unique").on(table.videoId, table.userId, table.frameNumber),
]);

export const pgDrizzleSourceVideo = pgTable("pg-drizzle_source_video", {
	id: uuid().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	s3Key: varchar({ length: 512 }).notNull(),
	fps: real(),
	width: integer(),
	height: integer(),
	durationSeconds: real("duration_seconds"),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("source_video_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);
