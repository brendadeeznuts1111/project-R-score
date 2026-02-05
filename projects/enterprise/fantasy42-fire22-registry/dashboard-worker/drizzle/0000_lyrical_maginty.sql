CREATE TABLE `bets` (
	`id` integer PRIMARY KEY NOT NULL,
	`customer_id` integer,
	`amount` real,
	`odds` real,
	`type` text,
	`status` text DEFAULT 'pending',
	`outcome` text,
	`teams` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`username` text,
	`first_name` text,
	`last_name` text,
	`login` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY NOT NULL,
	`customer_id` text,
	`amount` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`agent_id` text DEFAULT 'BLAKEPPH',
	`tran_code` text,
	`tran_type` text,
	`document_number` text,
	`entered_by` text,
	`freeplay_balance` real DEFAULT 0,
	`freeplay_pending_balance` real DEFAULT 0,
	`freeplay_pending_count` integer DEFAULT 0,
	`grade_num` integer,
	`login` text,
	`short_desc` text,
	`tran_datetime` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_customer_id_unique` ON `customers` (`customer_id`);