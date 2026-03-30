ALTER TABLE `sales_records` MODIFY COLUMN `division` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_records` ADD `subChannel` varchar(100);--> statement-breakpoint
ALTER TABLE `contract_records` ADD `achievementRate` decimal(5,1) DEFAULT '0';