CREATE TABLE `contract_records` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`channel` varchar(100) NOT NULL,
	`previousMonthCount` int DEFAULT 0,
	`monthlyTarget` int DEFAULT 0,
	`week1Count` int DEFAULT 0,
	`week2Count` int DEFAULT 0,
	`week3Count` int DEFAULT 0,
	`week4Count` int DEFAULT 0,
	`week5Count` int DEFAULT 0,
	`totalCount` int DEFAULT 0,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_records` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`division` enum('mat','distribution') NOT NULL,
	`productGroup` varchar(100) NOT NULL,
	`monthlyTarget` bigint DEFAULT 0,
	`previousMonthSales` bigint DEFAULT 0,
	`week1Sales` bigint DEFAULT 0,
	`week2Sales` bigint DEFAULT 0,
	`week3Sales` bigint DEFAULT 0,
	`week4Sales` bigint DEFAULT 0,
	`week5Sales` bigint DEFAULT 0,
	`cumulativeSales` bigint DEFAULT 0,
	`achievementRate` decimal(5,1) DEFAULT '0',
	`year` int NOT NULL,
	`month` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contract_records` ADD CONSTRAINT `contract_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_records` ADD CONSTRAINT `sales_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;