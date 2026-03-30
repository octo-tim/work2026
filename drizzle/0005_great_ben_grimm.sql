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
ALTER TABLE `quarterly_reviews` ADD CONSTRAINT `quarterly_reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;