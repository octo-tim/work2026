CREATE TABLE `contractBusinessPlanHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractBusinessPlanId` int NOT NULL,
	`year` int NOT NULL,
	`channel` varchar(50) NOT NULL,
	`subChannel` varchar(100),
	`month1` int DEFAULT 0,
	`month2` int DEFAULT 0,
	`month3` int DEFAULT 0,
	`month4` int DEFAULT 0,
	`month5` int DEFAULT 0,
	`month6` int DEFAULT 0,
	`month7` int DEFAULT 0,
	`month8` int DEFAULT 0,
	`month9` int DEFAULT 0,
	`month10` int DEFAULT 0,
	`month11` int DEFAULT 0,
	`month12` int DEFAULT 0,
	`total` int DEFAULT 0,
	`changedBy` int,
	`changeReason` text,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contractBusinessPlanHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contractBusinessPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`channel` varchar(50) NOT NULL,
	`subChannel` varchar(100),
	`month1` int DEFAULT 0,
	`month2` int DEFAULT 0,
	`month3` int DEFAULT 0,
	`month4` int DEFAULT 0,
	`month5` int DEFAULT 0,
	`month6` int DEFAULT 0,
	`month7` int DEFAULT 0,
	`month8` int DEFAULT 0,
	`month9` int DEFAULT 0,
	`month10` int DEFAULT 0,
	`month11` int DEFAULT 0,
	`month12` int DEFAULT 0,
	`total` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contractBusinessPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contractBusinessPlanHistory` ADD CONSTRAINT `contractBusinessPlanHistory_contractBusinessPlanId_contractBusinessPlans_id_fk` FOREIGN KEY (`contractBusinessPlanId`) REFERENCES `contractBusinessPlans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contractBusinessPlanHistory` ADD CONSTRAINT `contractBusinessPlanHistory_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;