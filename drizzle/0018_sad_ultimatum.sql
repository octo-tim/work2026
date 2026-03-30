CREATE TABLE `businessPlanHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessPlanId` int NOT NULL,
	`year` int NOT NULL,
	`category` varchar(20) NOT NULL,
	`division` varchar(50) NOT NULL,
	`subDivision` varchar(50),
	`month1` decimal(20,2) DEFAULT '0',
	`month2` decimal(20,2) DEFAULT '0',
	`month3` decimal(20,2) DEFAULT '0',
	`month4` decimal(20,2) DEFAULT '0',
	`month5` decimal(20,2) DEFAULT '0',
	`month6` decimal(20,2) DEFAULT '0',
	`month7` decimal(20,2) DEFAULT '0',
	`month8` decimal(20,2) DEFAULT '0',
	`month9` decimal(20,2) DEFAULT '0',
	`month10` decimal(20,2) DEFAULT '0',
	`month11` decimal(20,2) DEFAULT '0',
	`month12` decimal(20,2) DEFAULT '0',
	`total` decimal(20,2) DEFAULT '0',
	`changedBy` int,
	`changeReason` text,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `businessPlanHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `businessPlanHistory` ADD CONSTRAINT `businessPlanHistory_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;