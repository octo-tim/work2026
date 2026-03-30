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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;