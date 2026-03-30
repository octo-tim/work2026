CREATE TABLE `contract_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_sub_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_sub_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`division` varchar(50) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contract_sub_channels` ADD CONSTRAINT `contract_sub_channels_channelId_contract_channels_id_fk` FOREIGN KEY (`channelId`) REFERENCES `contract_channels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_items` ADD CONSTRAINT `sales_items_categoryId_sales_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `sales_categories`(`id`) ON DELETE no action ON UPDATE no action;