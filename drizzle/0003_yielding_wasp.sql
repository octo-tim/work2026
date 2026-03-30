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
ALTER TABLE `goals` ADD CONSTRAINT `goals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;