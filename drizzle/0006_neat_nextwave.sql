CREATE TABLE `kpi_indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiItemId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`unit` varchar(50) DEFAULT '',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`division` varchar(100) NOT NULL,
	`department` varchar(100) NOT NULL,
	`person` varchar(100) NOT NULL,
	`category` varchar(100) NOT NULL,
	`task` varchar(200) NOT NULL,
	`goal` varchar(500) DEFAULT '',
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiIndicatorId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`week` int NOT NULL,
	`value` decimal(15,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `kpi_indicators` ADD CONSTRAINT `kpi_indicators_kpiItemId_kpi_items_id_fk` FOREIGN KEY (`kpiItemId`) REFERENCES `kpi_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kpi_records` ADD CONSTRAINT `kpi_records_kpiIndicatorId_kpi_indicators_id_fk` FOREIGN KEY (`kpiIndicatorId`) REFERENCES `kpi_indicators`(`id`) ON DELETE cascade ON UPDATE no action;