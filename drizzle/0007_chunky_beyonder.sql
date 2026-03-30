CREATE TABLE `kpi_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiIndicatorId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`monthlyTarget` decimal(15,2) DEFAULT '0',
	`previousActual` decimal(15,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `kpi_targets` ADD CONSTRAINT `kpi_targets_kpiIndicatorId_kpi_indicators_id_fk` FOREIGN KEY (`kpiIndicatorId`) REFERENCES `kpi_indicators`(`id`) ON DELETE cascade ON UPDATE no action;