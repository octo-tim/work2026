CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportType` enum('weekly','monthly') NOT NULL,
	`reportScope` enum('individual','team','division') NOT NULL,
	`targetUserId` int,
	`targetTeamId` int,
	`targetDivisionId` int,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`week` int,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`summary` text,
	`nextPlan` text,
	`issues` text,
	`generatedBy` int,
	`reportStatus` enum('draft','finalized') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_targetTeamId_teams_id_fk` FOREIGN KEY (`targetTeamId`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_targetDivisionId_divisions_id_fk` FOREIGN KEY (`targetDivisionId`) REFERENCES `divisions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_generatedBy_users_id_fk` FOREIGN KEY (`generatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;