CREATE TABLE `recovery_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recovery_codes_user_idx` ON `recovery_codes` (`user_id`);--> statement-breakpoint
CREATE INDEX `recovery_codes_user_used_idx` ON `recovery_codes` (`user_id`,`used`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`name` text NOT NULL,
	`description` text,
	`password` text,
	`only_ask_for_password_on_first_join` integer NOT NULL,
	`server_id` text NOT NULL,
	`secret_token` text,
	`logo_id` integer,
	`allow_new_users` integer NOT NULL,
	`direct_messages_enabled` integer NOT NULL,
	`storage_uploads_enabled` integer NOT NULL,
	`storage_quota` integer NOT NULL,
	`storage_upload_max_file_size` integer NOT NULL,
	`storage_max_avatar_size` integer NOT NULL,
	`storage_max_banner_size` integer NOT NULL,
	`storage_max_files_per_message` integer NOT NULL,
	`storage_file_sharing_in_direct_messages` integer NOT NULL,
	`storage_space_quota_by_user` integer NOT NULL,
	`storage_overflow_action` text NOT NULL,
	`enable_plugins` integer NOT NULL,
	`enable_search` integer NOT NULL,
	`show_welcome_dialog` integer NOT NULL,
	`storage_signed_urls_enabled` integer NOT NULL,
	`storage_signed_urls_ttl_seconds` integer NOT NULL,
	FOREIGN KEY (`logo_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_settings`("name", "description", "password", "only_ask_for_password_on_first_join", "server_id", "secret_token", "logo_id", "allow_new_users", "direct_messages_enabled", "storage_uploads_enabled", "storage_quota", "storage_upload_max_file_size", "storage_max_avatar_size", "storage_max_banner_size", "storage_max_files_per_message", "storage_file_sharing_in_direct_messages", "storage_space_quota_by_user", "storage_overflow_action", "enable_plugins", "enable_search", "show_welcome_dialog", "storage_signed_urls_enabled", "storage_signed_urls_ttl_seconds") SELECT "name", "description", "password", "only_ask_for_password_on_first_join", "server_id", "secret_token", "logo_id", "allow_new_users", "direct_messages_enabled", "storage_uploads_enabled", "storage_quota", "storage_upload_max_file_size", "storage_max_avatar_size", "storage_max_banner_size", "storage_max_files_per_message", "storage_file_sharing_in_direct_messages", "storage_space_quota_by_user", "storage_overflow_action", "enable_plugins", "enable_search", "show_welcome_dialog", "storage_signed_urls_enabled", "storage_signed_urls_ttl_seconds" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `settings_server_idx` ON `settings` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `settings_server_unique_idx` ON `settings` (`server_id`);