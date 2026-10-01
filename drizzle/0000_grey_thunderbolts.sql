CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`document` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`address` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_owner_document` ON `clients` (`owner`,`document`);--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`client_id` text NOT NULL,
	`plot_id` text NOT NULL,
	`price` integer NOT NULL,
	`down_payment` integer NOT NULL,
	`count` integer NOT NULL,
	`annual_rate` text NOT NULL,
	`first_due` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plot_id`) REFERENCES `plots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contracts_plot` ON `contracts` (`plot_id`);--> statement-breakpoint
CREATE INDEX `contracts_owner` ON `contracts` (`owner`);--> statement-breakpoint
CREATE TABLE `installments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`contract_id` text NOT NULL,
	`number` integer NOT NULL,
	`due` text NOT NULL,
	`amount` integer NOT NULL,
	`paid_on` text,
	`method` text,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `installments_owner_due` ON `installments` (`owner`,`due`);--> statement-breakpoint
CREATE TABLE `plots` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`block` text NOT NULL,
	`number` text NOT NULL,
	`area` text NOT NULL,
	`price` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plots_owner_block_number` ON `plots` (`owner`,`block`,`number`);--> statement-breakpoint
CREATE TABLE `settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`document` text NOT NULL,
	`phone` text NOT NULL
);
