CREATE TABLE `financial_balances` (
	`id` varchar(36) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`openingBalance` bigint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_records` (
	`id` varchar(36) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`week` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`amount` bigint NOT NULL DEFAULT 0,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_records_id` PRIMARY KEY(`id`)
);
