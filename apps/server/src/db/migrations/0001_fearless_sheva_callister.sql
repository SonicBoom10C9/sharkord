CREATE TABLE `user_roles` (
	`userId` integer NOT NULL,
	`roleId` integer NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `roleId`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_roles_user_idx` ON `user_roles` (`userId`);--> statement-breakpoint
CREATE INDEX `user_roles_role_idx` ON `user_roles` (`roleId`);--> statement-breakpoint
-- Migrate existing role assignments to user_roles table
INSERT INTO `user_roles` (`userId`, `roleId`, `createdAt`)
SELECT `id`, `roleId`, `createdAt` FROM `users` WHERE `roleId` IS NOT NULL;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identity` text NOT NULL,
	`password` text NOT NULL,
	`name` text NOT NULL,
	`avatarId` integer,
	`bannerId` integer,
	`bio` text,
	`banned` integer DEFAULT false NOT NULL,
	`banReason` text,
	`bannedAt` integer,
	`bannerColor` text,
	`lastLoginAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`avatarId`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bannerId`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "identity", "password", "name", "avatarId", "bannerId", "bio", "banned", "banReason", "bannedAt", "bannerColor", "lastLoginAt", "createdAt", "updatedAt") SELECT "id", "identity", "password", "name", "avatarId", "bannerId", "bio", "banned", "banReason", "bannedAt", "bannerColor", "lastLoginAt", "createdAt", "updatedAt" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_identity_unique` ON `users` (`identity`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_identity_idx` ON `users` (`identity`);