CREATE TABLE `task_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(200) DEFAULT 'application/octet-stream',
	`fileSize` bigint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;