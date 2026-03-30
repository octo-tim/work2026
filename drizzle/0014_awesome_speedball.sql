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
ALTER TABLE `sales_events` ADD CONSTRAINT `sales_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;