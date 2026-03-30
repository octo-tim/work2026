CREATE TABLE `kpi_assignees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`department` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_assignees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_item_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiItemId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`previousEvaluation` text,
	`currentPlan` text,
	`execution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_item_details_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `kpi_item_details` ADD CONSTRAINT `kpi_item_details_kpiItemId_kpi_items_id_fk` FOREIGN KEY (`kpiItemId`) REFERENCES `kpi_items`(`id`) ON DELETE cascade ON UPDATE no action;