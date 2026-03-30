CREATE TABLE `archived_task_progress_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`archivedTaskId` varchar(36) NOT NULL,
	`logDate` timestamp NOT NULL,
	`content` text NOT NULL,
	`originalCreatedAt` timestamp NOT NULL,
	CONSTRAINT `archived_task_progress_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `archived_tasks` (
	`id` varchar(36) NOT NULL,
	`originalTaskId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`number` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`department` varchar(100) DEFAULT '',
	`assignee` varchar(100) DEFAULT '',
	`schedule` varchar(100) DEFAULT '',
	`details` text,
	`status` enum('pending','in-progress','completed') NOT NULL DEFAULT 'pending',
	`startDate` timestamp,
	`dueDate` timestamp,
	`originalCreatedAt` timestamp NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	`archivedBy` int NOT NULL,
	`archiveReason` varchar(200),
	CONSTRAINT `archived_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businessPlanActuals` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessPlanActuals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `businessPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `contract_records` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`channel` varchar(100) NOT NULL,
	`subChannel` varchar(100),
	`previousMonthCount` int DEFAULT 0,
	`monthlyTarget` int DEFAULT 0,
	`week1Count` int DEFAULT 0,
	`week2Count` int DEFAULT 0,
	`week3Count` int DEFAULT 0,
	`week4Count` int DEFAULT 0,
	`week5Count` int DEFAULT 0,
	`totalCount` int DEFAULT 0,
	`achievementRate` decimal(5,1) DEFAULT '0',
	`year` int NOT NULL,
	`month` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_records_id` PRIMARY KEY(`id`)
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
CREATE TABLE `divisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `divisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `divisions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`year` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`targetValue` bigint DEFAULT 0,
	`currentValue` bigint DEFAULT 0,
	`unit` varchar(50) DEFAULT '',
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('not-started','in-progress','completed','delayed') NOT NULL DEFAULT 'not-started',
	`startDate` varchar(20),
	`endDate` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_minutes` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`meetingDate` timestamp NOT NULL,
	`title` varchar(200) NOT NULL,
	`location` varchar(200),
	`attendees` text,
	`content` text,
	`decisions` text,
	`actionItems` text,
	`nextMeetingDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meeting_minutes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_messages` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`message` text NOT NULL,
	`authorName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`),
	CONSTRAINT `positions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `quarterly_reviews` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`year` int NOT NULL,
	`quarter` enum('Q1','Q2','Q3','Q4') NOT NULL,
	`salesTarget` bigint DEFAULT 0,
	`salesActual` bigint DEFAULT 0,
	`profitTarget` bigint DEFAULT 0,
	`profitActual` bigint DEFAULT 0,
	`strategy1Progress` int DEFAULT 0,
	`strategy2Progress` int DEFAULT 0,
	`strategy3Progress` int DEFAULT 0,
	`strategy4Progress` int DEFAULT 0,
	`achievements` text,
	`improvements` text,
	`nextQuarterPlan` text,
	`overallRating` enum('excellent','good','fair','poor') DEFAULT 'fair',
	`overallComment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quarterly_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ranks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`level` int NOT NULL DEFAULT 0,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ranks_id` PRIMARY KEY(`id`),
	CONSTRAINT `ranks_name_unique` UNIQUE(`name`)
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
CREATE TABLE `sales_events` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`eventDate` timestamp NOT NULL,
	`endDate` timestamp,
	`isAllDay` boolean NOT NULL DEFAULT true,
	`eventType` enum('meeting','deadline','promotion','holiday','payment','launch','other') NOT NULL DEFAULT 'other',
	`color` varchar(20) DEFAULT '#3b82f6',
	`division` varchar(50),
	`reminderDays` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_events_id` PRIMARY KEY(`id`)
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
CREATE TABLE `sales_records` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`division` varchar(50) NOT NULL,
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
CREATE TABLE `task_progress_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` varchar(36) NOT NULL,
	`logDate` timestamp NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_progress_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`number` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`department` varchar(100) DEFAULT '',
	`assignee` varchar(100) DEFAULT '',
	`schedule` varchar(100) DEFAULT '',
	`details` text,
	`status` enum('pending','in-progress','completed') NOT NULL DEFAULT 'pending',
	`startDate` timestamp,
	`dueDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`divisionId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`koreanName` varchar(50),
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`divisionId` int,
	`teamId` int,
	`positionId` int,
	`rankId` int,
	`isProfileComplete` boolean NOT NULL DEFAULT false,
	`canEditSales` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `archived_task_progress_logs` ADD CONSTRAINT `archived_task_progress_logs_archivedTaskId_archived_tasks_id_fk` FOREIGN KEY (`archivedTaskId`) REFERENCES `archived_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `archived_tasks` ADD CONSTRAINT `archived_tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `archived_tasks` ADD CONSTRAINT `archived_tasks_archivedBy_users_id_fk` FOREIGN KEY (`archivedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businessPlanHistory` ADD CONSTRAINT `businessPlanHistory_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_records` ADD CONSTRAINT `contract_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_sub_channels` ADD CONSTRAINT `contract_sub_channels_channelId_contract_channels_id_fk` FOREIGN KEY (`channelId`) REFERENCES `contract_channels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meeting_minutes` ADD CONSTRAINT `meeting_minutes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_messages` ADD CONSTRAINT `monthly_messages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quarterly_reviews` ADD CONSTRAINT `quarterly_reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_events` ADD CONSTRAINT `sales_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_items` ADD CONSTRAINT `sales_items_categoryId_sales_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `sales_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_records` ADD CONSTRAINT `sales_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_progress_logs` ADD CONSTRAINT `task_progress_logs_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_divisionId_divisions_id_fk` FOREIGN KEY (`divisionId`) REFERENCES `divisions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_divisionId_divisions_id_fk` FOREIGN KEY (`divisionId`) REFERENCES `divisions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_positionId_positions_id_fk` FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_rankId_ranks_id_fk` FOREIGN KEY (`rankId`) REFERENCES `ranks`(`id`) ON DELETE no action ON UPDATE no action;