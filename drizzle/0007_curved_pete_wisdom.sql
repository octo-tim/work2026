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
ALTER TABLE `meeting_minutes` ADD CONSTRAINT `meeting_minutes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;