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
ALTER TABLE `task_progress_logs` ADD CONSTRAINT `task_progress_logs_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;