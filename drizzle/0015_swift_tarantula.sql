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
ALTER TABLE `monthly_messages` ADD CONSTRAINT `monthly_messages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;