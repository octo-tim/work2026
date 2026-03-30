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
ALTER TABLE `archived_task_progress_logs` ADD CONSTRAINT `archived_task_progress_logs_archivedTaskId_archived_tasks_id_fk` FOREIGN KEY (`archivedTaskId`) REFERENCES `archived_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `archived_tasks` ADD CONSTRAINT `archived_tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `archived_tasks` ADD CONSTRAINT `archived_tasks_archivedBy_users_id_fk` FOREIGN KEY (`archivedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;