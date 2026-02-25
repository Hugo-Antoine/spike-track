import { relations } from "drizzle-orm/relations";
import { pgDrizzleSourceVideo, pgDrizzleVideo, user, pgDrizzlePost, pgDrizzleQueueConfig, pgDrizzleUserVideoProgress, pgDrizzleAnnotation } from "./schema";

export const pgDrizzleVideoRelations = relations(pgDrizzleVideo, ({one, many}) => ({
	pgDrizzleSourceVideo: one(pgDrizzleSourceVideo, {
		fields: [pgDrizzleVideo.sourceVideoId],
		references: [pgDrizzleSourceVideo.id]
	}),
	pgDrizzleUserVideoProgresses: many(pgDrizzleUserVideoProgress),
	pgDrizzleAnnotations: many(pgDrizzleAnnotation),
}));

export const pgDrizzleSourceVideoRelations = relations(pgDrizzleSourceVideo, ({many}) => ({
	pgDrizzleVideos: many(pgDrizzleVideo),
}));

export const pgDrizzlePostRelations = relations(pgDrizzlePost, ({one}) => ({
	user: one(user, {
		fields: [pgDrizzlePost.createdById],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	pgDrizzlePosts: many(pgDrizzlePost),
	pgDrizzleQueueConfigs: many(pgDrizzleQueueConfig),
	pgDrizzleUserVideoProgresses: many(pgDrizzleUserVideoProgress),
	pgDrizzleAnnotations: many(pgDrizzleAnnotation),
}));

export const pgDrizzleQueueConfigRelations = relations(pgDrizzleQueueConfig, ({one}) => ({
	user: one(user, {
		fields: [pgDrizzleQueueConfig.updatedBy],
		references: [user.id]
	}),
}));

export const pgDrizzleUserVideoProgressRelations = relations(pgDrizzleUserVideoProgress, ({one}) => ({
	user: one(user, {
		fields: [pgDrizzleUserVideoProgress.userId],
		references: [user.id]
	}),
	pgDrizzleVideo: one(pgDrizzleVideo, {
		fields: [pgDrizzleUserVideoProgress.videoId],
		references: [pgDrizzleVideo.id]
	}),
}));

export const pgDrizzleAnnotationRelations = relations(pgDrizzleAnnotation, ({one}) => ({
	pgDrizzleVideo: one(pgDrizzleVideo, {
		fields: [pgDrizzleAnnotation.videoId],
		references: [pgDrizzleVideo.id]
	}),
	user: one(user, {
		fields: [pgDrizzleAnnotation.userId],
		references: [user.id]
	}),
}));