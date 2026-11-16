CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`limit_minor` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`icon` text NOT NULL,
	`color_key` text NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`is_seed` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `monthly_totals` (
	`month_key` text NOT NULL,
	`category_id` text NOT NULL,
	`kind` text NOT NULL,
	`total_minor` integer NOT NULL,
	`entry_count` integer NOT NULL,
	PRIMARY KEY(`month_key`, `category_id`, `kind`)
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurring_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`category_id` text NOT NULL,
	`note` text,
	`frequency` text NOT NULL,
	`day` integer NOT NULL,
	`start_on` text NOT NULL,
	`last_generated_on` text,
	`active` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`category_id` text NOT NULL,
	`occurred_on` text NOT NULL,
	`month_key` text NOT NULL,
	`note` text,
	`recurring_rule_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tx_date` ON `transactions` (`deleted_at`,`occurred_on`);--> statement-breakpoint
CREATE INDEX `idx_tx_month_cat` ON `transactions` (`month_key`,`category_id`,`kind`,`deleted_at`);