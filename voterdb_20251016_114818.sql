-- MySQL dump 10.13  Distrib 8.4.6, for Linux (aarch64)
--
-- Host: localhost    Database: voterdb
-- ------------------------------------------------------
-- Server version	8.4.6

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `AuthOtp`
--

DROP TABLE IF EXISTS `AuthOtp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AuthOtp` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` enum('LOGIN','VERIFY_PHONE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LOGIN',
  `codeHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `consumedAt` datetime(3) DEFAULT NULL,
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AuthOtp_phone_purpose_expiresAt_idx` (`phone`,`purpose`,`expiresAt`),
  KEY `AuthOtp_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AuthOtp`
--

LOCK TABLES `AuthOtp` WRITE;
/*!40000 ALTER TABLE `AuthOtp` DISABLE KEYS */;
INSERT INTO `AuthOtp` VALUES (1,'+917340497820','VERIFY_PHONE','37ccdaeb4979102a48c6002e52cd99976650e18f3dc2d68794af7d6948c2838e','2025-10-15 11:26:14.818',NULL,0,NULL,NULL,'2025-10-15 11:11:14.823'),(2,'+917593740598','VERIFY_PHONE','b481135da14b6256a117abd6f1db35ce89886e720b47c72062a4ac2b5f7f8fe3','2025-10-15 12:42:43.127',NULL,0,NULL,NULL,'2025-10-15 12:27:43.133'),(3,'+917340497820','LOGIN','b62fafd5340a2888146d585d97627eecd2025f77f99a30170a552b781f707d75','2025-10-15 12:43:03.578','2025-10-15 12:28:28.165',0,NULL,NULL,'2025-10-15 12:28:03.586'),(4,'+917340497820','LOGIN','596478945e40b24cb0624a82f30f90a97617e40ef9d0eaf40e199e068302864d','2025-10-15 12:50:35.069','2025-10-15 12:36:09.117',0,NULL,NULL,'2025-10-15 12:35:35.076'),(5,'+917340497820','LOGIN','9a853e91a90471cbf3ee85a0ac72b938121b49a5d806186a74b91bb39910048a','2025-10-15 17:24:04.050','2025-10-15 17:09:33.852',0,NULL,NULL,'2025-10-15 17:09:04.056'),(6,'+917340497820','LOGIN','f312fb05e70383c3d68b19e841793124f3362251c207ba9638a4a9190acdc01d','2025-10-15 18:56:54.720','2025-10-15 18:42:06.203',0,NULL,NULL,'2025-10-15 18:41:54.725');
/*!40000 ALTER TABLE `AuthOtp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ImportBatch`
--

DROP TABLE IF EXISTS `ImportBatch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ImportBatch` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `fileName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','PROCESSING','COMPLETED','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `rowCount` int unsigned NOT NULL DEFAULT '0',
  `successCount` int unsigned NOT NULL DEFAULT '0',
  `failedCount` int unsigned NOT NULL DEFAULT '0',
  `startedAt` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `uploadedById` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ImportBatch_status_idx` (`status`),
  KEY `ImportBatch_createdAt_idx` (`createdAt`),
  KEY `ImportBatch_uploadedById_fkey` (`uploadedById`),
  CONSTRAINT `ImportBatch_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ImportBatch`
--

LOCK TABLES `ImportBatch` WRITE;
/*!40000 ALTER TABLE `ImportBatch` DISABLE KEYS */;
INSERT INTO `ImportBatch` VALUES (1,'voters_import_template.xlsx','COMPLETED',10,10,0,'2025-10-15 11:12:53.107','2025-10-15 11:12:53.219','2025-10-15 11:12:53.108',1),(2,'voters_bulk_template.xlsx','COMPLETED',10,10,0,'2025-10-15 12:01:02.510','2025-10-15 12:01:02.618','2025-10-15 12:01:02.510',1),(3,'voters_bulk_template.xlsx','COMPLETED',10,10,0,'2025-10-15 12:09:29.384','2025-10-15 12:09:29.553','2025-10-15 12:09:29.386',1),(4,'voters_bulk_template.xlsx','COMPLETED',10,10,0,'2025-10-15 18:54:56.697','2025-10-15 18:54:56.810','2025-10-15 18:54:56.698',1);
/*!40000 ALTER TABLE `ImportBatch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ImportRow`
--

DROP TABLE IF EXISTS `ImportRow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ImportRow` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `batchId` bigint unsigned NOT NULL,
  `status` enum('SUCCESS','FAILED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SKIPPED',
  `error` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raw` text COLLATE utf8mb4_unicode_ci,
  `voterIdStr` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone1` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voterId` bigint unsigned DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `familyExternalId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `familyIdType` enum('JAN_AADHAAR_FAMILY_ID','RATION_CARD_NO','OTHER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ImportRow_batchId_status_idx` (`batchId`,`status`),
  KEY `ImportRow_voterId_idx` (`voterId`),
  KEY `ImportRow_voterIdStr_idx` (`voterIdStr`),
  KEY `ImportRow_familyExternalId_idx` (`familyExternalId`),
  CONSTRAINT `ImportRow_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ImportBatch` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ImportRow_voterId_fkey` FOREIGN KEY (`voterId`) REFERENCES `Voter` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ImportRow`
--

LOCK TABLES `ImportRow` WRITE;
/*!40000 ALTER TABLE `ImportRow` DISABLE KEYS */;
INSERT INTO `ImportRow` VALUES (1,1,'SUCCESS',NULL,'{\"name\":\"Ramesh Kumar\",\"village\":\"Udaipur\",\"voterId\":\"RJ/12/1234567\",\"mobile1\":\"9876543210\",\"email\":\"ramesh@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"boothName\":\"Govt School\",\"boothNo\":\"12\",\"partNo\":\"45\",\"srn\":\"123\",\"age\":\"42\",\"gender\":\"M\",\"dob\":\"1983-05-12\",\"houseNo\":\"A-14\",\"address\":\"Main Road, Ward 3\",\"caste\":\"Rajput\",\"profession\":\"Farmer\",\"society\":\"Sunrise Society\",\"flatNo\":\"12B\",\"demands\":\"Road repair\",\"extraInfo1\":\"Notes 1\",\"extraCheck1\":\"0\",\"extraCheck2\":\"0\"}','RJ/12/1234567','9876543210',NULL,'2025-10-15 11:12:53.168',NULL,NULL),(2,1,'SUCCESS',NULL,'{\"name\":\"Sita Devi\",\"village\":\"Rashmi\",\"voterId\":\"RJ/34/7654321\",\"mobile1\":\"9876500001\",\"mobile2\":\"9876500002\",\"email\":\"sita@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"1\",\"dead\":\"0\",\"boothName\":\"Panchayat Bhawan\",\"boothNo\":\"7\",\"partNo\":\"12\",\"srn\":\"56\",\"age\":\"36\",\"gender\":\"F\",\"dob\":\"1989-10-02\",\"houseNo\":\"H-22\",\"address\":\"Near Temple\",\"caste\":\"Brahmin\",\"profession\":\"Teacher\",\"demands\":\"Water supply\",\"extraInfo2\":\"Self-help group\",\"extraCheck1\":\"1\",\"extraCheck2\":\"0\"}','RJ/34/7654321','9876500001',NULL,'2025-10-15 11:12:53.181',NULL,NULL),(3,1,'SUCCESS',NULL,'{\"name\":\"Vikram Singh\",\"village\":\"Chittorgarh\",\"mobile1\":\"9829001111\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"boothNo\":\"3\",\"partNo\":\"9\",\"srn\":\"201\",\"age\":\"29\",\"gender\":\"M\",\"caste\":\"Rajput\",\"profession\":\"Driver\",\"extraInfo5\":\"0\",\"extraCheck1\":\"0\"}',NULL,'9829001111',NULL,'2025-10-15 11:12:53.190',NULL,NULL),(4,1,'SUCCESS',NULL,'{\"name\":\"Asha Bai\",\"village\":\"Bhadesar\",\"voterId\":\"RJ/56/1111222\",\"mobile1\":\"9988776655\",\"email\":\"asha.b@example.com\",\"colourCode\":\"OPPOSITE\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"boothName\":\"College\",\"boothNo\":\"15\",\"partNo\":\"2\",\"srn\":\"5\",\"age\":\"51\",\"gender\":\"F\",\"dob\":\"1974-03-21\",\"houseNo\":\"24\",\"address\":\"Colony Road\",\"profession\":\"Homemaker\",\"society\":\"Green Society\",\"extraInfo5\":\"0\",\"extraCheck1\":\"0\"}','RJ/56/1111222','9988776655',NULL,'2025-10-15 11:12:53.195',NULL,NULL),(5,1,'SUCCESS',NULL,'{\"name\":\"Mahesh Lal\",\"village\":\"Kapasan\",\"mobile1\":\"9810012345\",\"colourCode\":\"OTHER\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"age\":\"33\",\"gender\":\"M\",\"dob\":\"1992-01-11\",\"caste\":\"Gurjar\",\"profession\":\"Shopkeeper\",\"newAddress\":\"Shifted to city\",\"extraInfo5\":\"0\",\"extraCheck1\":\"0\"}',NULL,'9810012345',NULL,'2025-10-15 11:12:53.199',NULL,NULL),(6,1,'SUCCESS',NULL,'{\"name\":\"Kavita Sharma\",\"village\":\"Udaipur\",\"voterId\":\"RJ/78/3333444\",\"mobile1\":\"7000011112\",\"mobile2\":\"7000011113\",\"email\":\"kavita.s@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"1\",\"dead\":\"0\",\"boothName\":\"Community Hall\",\"boothNo\":\"21\",\"partNo\":\"10\",\"srn\":\"77\",\"age\":\"28\",\"gender\":\"F\",\"dob\":\"1997-08-19\",\"houseNo\":\"B-9\",\"address\":\"Sector 5\",\"caste\":\"Brahmin\",\"profession\":\"Nurse\",\"flatNo\":\"5A\",\"demands\":\"Anganwadi upgrade\",\"extraCheck1\":\"0\",\"extraCheck2\":\"1\"}','RJ/78/3333444','7000011112',NULL,'2025-10-15 11:12:53.203',NULL,NULL),(7,1,'SUCCESS',NULL,'{\"name\":\"Imran Khan\",\"village\":\"Mavli\",\"mobile1\":\"9090909090\",\"email\":\"imrank@example.com\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"boothNo\":\"4\",\"partNo\":\"8\",\"srn\":\"300\",\"age\":\"40\",\"gender\":\"M\",\"dob\":\"1985-12-30\",\"address\":\"Near Market\",\"caste\":\"Muslim\",\"profession\":\"Mechanic\",\"demands\":\"Street lights\",\"extraInfo1\":\"Ward volunteer\",\"extraInfo5\":\"1\",\"extraCheck1\":\"0\"}',NULL,'9090909090',NULL,'2025-10-15 11:12:53.206',NULL,NULL),(8,1,'SUCCESS',NULL,'{\"name\":\"Pooja Jain\",\"village\":\"Nimbahera\",\"voterId\":\"RJ/90/5555666\",\"mobile1\":\"9123456780\",\"email\":\"pooja.j@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"boothName\":\"School 2\",\"boothNo\":\"6\",\"partNo\":\"1\",\"srn\":\"9\",\"age\":\"26\",\"gender\":\"F\",\"dob\":\"1999-04-15\",\"houseNo\":\"7\",\"address\":\"Station Road\",\"caste\":\"Jain\",\"profession\":\"Student\",\"society\":\"Lotus Society\",\"flatNo\":\"2C\",\"extraCheck1\":\"0\",\"extraCheck2\":\"0\"}','RJ/90/5555666','9123456780',NULL,'2025-10-15 11:12:53.210',NULL,NULL),(9,1,'SUCCESS',NULL,'{\"name\":\"Sunil Meena\",\"village\":\"Begun\",\"mobile1\":\"8888888888\",\"colourCode\":\"OTHER\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"age\":\"31\",\"gender\":\"M\",\"address\":\"Ward 2\",\"caste\":\"Meena\",\"profession\":\"Constable\",\"extraInfo5\":\"0\",\"extraCheck1\":\"0\"}',NULL,'8888888888',NULL,'2025-10-15 11:12:53.215',NULL,NULL),(10,1,'SUCCESS',NULL,'{\"name\":\"Rekha Kumari\",\"village\":\"Dungarpur\",\"voterId\":\"RJ/11/9999000\",\"mobile1\":\"9012345678\",\"mobile2\":\"9012345679\",\"email\":\"rekha.k@example.com\",\"colourCode\":\"OPPOSITE\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"boothName\":\"Govt School\",\"boothNo\":\"9\",\"partNo\":\"6\",\"srn\":\"44\",\"age\":\"38\",\"gender\":\"F\",\"dob\":\"1987-07-07\",\"houseNo\":\"C-31\",\"address\":\"Near Lake\",\"caste\":\"SC\",\"profession\":\"Tailor\",\"demands\":\"Drainage fix\",\"extraCheck1\":\"0\",\"extraCheck2\":\"0\"}','RJ/11/9999000','9012345678',NULL,'2025-10-15 11:12:53.218',NULL,NULL),(11,2,'SUCCESS',NULL,'{\"name\":\"Ramesh Sharma\",\"voterId\":\"RJ/UDR/10001\",\"age\":\"48\",\"gender\":\"M\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"101\",\"mobile1\":\"9876500001\",\"mobile2\":\"\",\"email\":\"ramesh@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1977-05-12\",\"caste\":\"Brahmin\",\"profession\":\"Shopkeeper\",\"demands\":\"Better street lights\",\"extraInfo\":\"Ward needs repair\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"HEAD\",\"headId\":\"\"}','RJ/UDR/10001','9876500001',NULL,'2025-10-15 12:01:02.570','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(12,2,'SUCCESS',NULL,'{\"name\":\"Sita Sharma\",\"voterId\":\"RJ/UDR/10002\",\"age\":\"45\",\"gender\":\"F\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"102\",\"mobile1\":\"9876500002\",\"mobile2\":\"\",\"email\":\"sita@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1980-08-22\",\"caste\":\"Brahmin\",\"profession\":\"Homemaker\",\"demands\":\"Community clinic needed\",\"extraInfo\":\"\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"SPOUSE\",\"headId\":\"\"}','RJ/UDR/10002','9876500002',NULL,'2025-10-15 12:01:02.585','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(13,2,'SUCCESS',NULL,'{\"name\":\"Aarav Sharma\",\"voterId\":\"RJ/UDR/10003\",\"age\":\"19\",\"gender\":\"M\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"103\",\"mobile1\":\"9876500003\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"OUR\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"2006-01-09\",\"caste\":\"Brahmin\",\"profession\":\"Student\",\"demands\":\"Sports ground\",\"extraInfo\":\"Youth club\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"CHILD\",\"headId\":\"\"}','RJ/UDR/10003','9876500003',NULL,'2025-10-15 12:01:02.594','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(14,2,'SUCCESS',NULL,'{\"name\":\"Shanti Devi\",\"voterId\":\"RJ/UDR/10004\",\"age\":\"70\",\"gender\":\"F\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"104\",\"mobile1\":\"9876500004\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1955-03-14\",\"caste\":\"Brahmin\",\"profession\":\"Retired\",\"demands\":\"Senior citizen pass\",\"extraInfo\":\"\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"PARENT\",\"headId\":\"\"}','RJ/UDR/10004','9876500004',NULL,'2025-10-15 12:01:02.601','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(15,2,'SUCCESS',NULL,'{\"name\":\"Imran Khan\",\"voterId\":\"RJ/UDR/20001\",\"age\":\"52\",\"gender\":\"M\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"201\",\"mobile1\":\"9876501001\",\"mobile2\":\"\",\"email\":\"imran@example.com\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1973-09-01\",\"caste\":\"Muslim\",\"profession\":\"Carpenter\",\"demands\":\"Drainage improvement\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"HEAD\",\"headId\":\"\"}','RJ/UDR/20001','9876501001',NULL,'2025-10-15 12:01:02.604','RC-5521','RATION_CARD_NO'),(16,2,'SUCCESS',NULL,'{\"name\":\"Zara Khan\",\"voterId\":\"RJ/UDR/20002\",\"age\":\"47\",\"gender\":\"F\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"202\",\"mobile1\":\"9876501002\",\"mobile2\":\"\",\"email\":\"zara@example.com\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1978-02-11\",\"caste\":\"Muslim\",\"profession\":\"Tailor\",\"demands\":\"Women skill center\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"SPOUSE\",\"headId\":\"\"}','RJ/UDR/20002','9876501002',NULL,'2025-10-15 12:01:02.606','RC-5521','RATION_CARD_NO'),(17,2,'SUCCESS',NULL,'{\"name\":\"Ayesha Khan\",\"voterId\":\"RJ/UDR/20003\",\"age\":\"24\",\"gender\":\"F\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"203\",\"mobile1\":\"9876501003\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"2001-07-21\",\"caste\":\"Muslim\",\"profession\":\"Nurse\",\"demands\":\"Street lighting\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"SIBLING\",\"headId\":\"\"}','RJ/UDR/20003','9876501003',NULL,'2025-10-15 12:01:02.610','RC-5521','RATION_CARD_NO'),(18,2,'SUCCESS',NULL,'{\"name\":\"Kabir Khan\",\"voterId\":\"RJ/UDR/20004\",\"age\":\"16\",\"gender\":\"M\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"204\",\"mobile1\":\"9876501004\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"2009-12-05\",\"caste\":\"Muslim\",\"profession\":\"Student\",\"demands\":\"Playground\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"CHILD\",\"headId\":\"\"}','RJ/UDR/20004','9876501004',NULL,'2025-10-15 12:01:02.612','RC-5521','RATION_CARD_NO'),(19,2,'SUCCESS',NULL,'{\"name\":\"Priya Verma\",\"voterId\":\"RJ/UDR/30001\",\"age\":\"29\",\"gender\":\"F\",\"village\":\"Rajiv Nagar\",\"houseNo\":\"45-B\",\"address\":\"Near Park\",\"boothName\":\"Govt School 3\",\"boothNo\":\"22\",\"partNo\":\"7\",\"srn\":\"301\",\"mobile1\":\"9876502001\",\"mobile2\":\"\",\"email\":\"priya@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"1\",\"dead\":\"0\",\"dob\":\"1996-04-19\",\"caste\":\"Kayastha\",\"profession\":\"Accountant\",\"demands\":\"Better public transport\",\"extraInfo\":\"Wants direct bus to market\",\"familyId\":\"\",\"familyIdType\":\"\",\"relationToHead\":\"\",\"headId\":\"\"}','RJ/UDR/30001','9876502001',NULL,'2025-10-15 12:01:02.615',NULL,NULL),(20,2,'SUCCESS',NULL,'{\"name\":\"Mohan Das\",\"voterId\":\"RJ/UDR/30002\",\"age\":\"38\",\"gender\":\"M\",\"village\":\"Old City\",\"houseNo\":\"9\",\"address\":\"Clock Tower Lane\",\"boothName\":\"Community Hall 1\",\"boothNo\":\"10\",\"partNo\":\"2\",\"srn\":\"302\",\"mobile1\":\"9876502002\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"OPPOSITE\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1987-11-30\",\"caste\":\"SC\",\"profession\":\"Driver\",\"demands\":\"Road repair\",\"extraInfo\":\"\",\"familyId\":\"\",\"familyIdType\":\"\",\"relationToHead\":\"\",\"headId\":\"\"}','RJ/UDR/30002','9876502002',NULL,'2025-10-15 12:01:02.618',NULL,NULL),(21,3,'SUCCESS',NULL,'{\"name\":\"Ramesh Sharma\",\"voterId\":\"RJ/UDR/10001\",\"age\":\"48\",\"gender\":\"M\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"101\",\"mobile1\":\"9876500001\",\"mobile2\":\"\",\"email\":\"ramesh@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1977-05-12\",\"caste\":\"Brahmin\",\"profession\":\"Shopkeeper\",\"demands\":\"Better street lights\",\"extraInfo\":\"Ward needs repair\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"HEAD\",\"headId\":\"\"}','RJ/UDR/10001','9876500001',NULL,'2025-10-15 12:09:29.427','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(22,3,'SUCCESS',NULL,'{\"name\":\"Sita Sharma\",\"voterId\":\"RJ/UDR/10002\",\"age\":\"45\",\"gender\":\"F\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"102\",\"mobile1\":\"9876500002\",\"mobile2\":\"\",\"email\":\"sita@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1980-08-22\",\"caste\":\"Brahmin\",\"profession\":\"Homemaker\",\"demands\":\"Community clinic needed\",\"extraInfo\":\"\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"SPOUSE\",\"headId\":\"\"}','RJ/UDR/10002','9876500002',NULL,'2025-10-15 12:09:29.448','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(23,3,'SUCCESS',NULL,'{\"name\":\"Aarav Sharma\",\"voterId\":\"RJ/UDR/10003\",\"age\":\"19\",\"gender\":\"M\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"103\",\"mobile1\":\"9876500003\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"OUR\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"2006-01-09\",\"caste\":\"Brahmin\",\"profession\":\"Student\",\"demands\":\"Sports ground\",\"extraInfo\":\"Youth club\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"CHILD\",\"headId\":\"\"}','RJ/UDR/10003','9876500003',NULL,'2025-10-15 12:09:29.463','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(24,3,'SUCCESS',NULL,'{\"name\":\"Shanti Devi\",\"voterId\":\"RJ/UDR/10004\",\"age\":\"70\",\"gender\":\"F\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"104\",\"mobile1\":\"9876500004\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1955-03-14\",\"caste\":\"Brahmin\",\"profession\":\"Retired\",\"demands\":\"Senior citizen pass\",\"extraInfo\":\"\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"PARENT\",\"headId\":\"\"}','RJ/UDR/10004','9876500004',NULL,'2025-10-15 12:09:29.479','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(25,3,'SUCCESS',NULL,'{\"name\":\"Imran Khan\",\"voterId\":\"RJ/UDR/20001\",\"age\":\"52\",\"gender\":\"M\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"201\",\"mobile1\":\"9876501001\",\"mobile2\":\"\",\"email\":\"imran@example.com\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1973-09-01\",\"caste\":\"Muslim\",\"profession\":\"Carpenter\",\"demands\":\"Drainage improvement\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"HEAD\",\"headId\":\"\"}','RJ/UDR/20001','9876501001',NULL,'2025-10-15 12:09:29.493','RC-5521','RATION_CARD_NO'),(26,3,'SUCCESS',NULL,'{\"name\":\"Zara Khan\",\"voterId\":\"RJ/UDR/20002\",\"age\":\"47\",\"gender\":\"F\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"202\",\"mobile1\":\"9876501002\",\"mobile2\":\"\",\"email\":\"zara@example.com\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1978-02-11\",\"caste\":\"Muslim\",\"profession\":\"Tailor\",\"demands\":\"Women skill center\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"SPOUSE\",\"headId\":\"\"}','RJ/UDR/20002','9876501002',NULL,'2025-10-15 12:09:29.505','RC-5521','RATION_CARD_NO'),(27,3,'SUCCESS',NULL,'{\"name\":\"Ayesha Khan\",\"voterId\":\"RJ/UDR/20003\",\"age\":\"24\",\"gender\":\"F\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"203\",\"mobile1\":\"9876501003\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"2001-07-21\",\"caste\":\"Muslim\",\"profession\":\"Nurse\",\"demands\":\"Street lighting\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"SIBLING\",\"headId\":\"\"}','RJ/UDR/20003','9876501003',NULL,'2025-10-15 12:09:29.515','RC-5521','RATION_CARD_NO'),(28,3,'SUCCESS',NULL,'{\"name\":\"Kabir Khan\",\"voterId\":\"RJ/UDR/20004\",\"age\":\"16\",\"gender\":\"M\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"204\",\"mobile1\":\"9876501004\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"2009-12-05\",\"caste\":\"Muslim\",\"profession\":\"Student\",\"demands\":\"Playground\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"CHILD\",\"headId\":\"\"}','RJ/UDR/20004','9876501004',NULL,'2025-10-15 12:09:29.525','RC-5521','RATION_CARD_NO'),(29,3,'SUCCESS',NULL,'{\"name\":\"Priya Verma\",\"voterId\":\"RJ/UDR/30001\",\"age\":\"29\",\"gender\":\"F\",\"village\":\"Rajiv Nagar\",\"houseNo\":\"45-B\",\"address\":\"Near Park\",\"boothName\":\"Govt School 3\",\"boothNo\":\"22\",\"partNo\":\"7\",\"srn\":\"301\",\"mobile1\":\"9876502001\",\"mobile2\":\"\",\"email\":\"priya@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"1\",\"dead\":\"0\",\"dob\":\"1996-04-19\",\"caste\":\"Kayastha\",\"profession\":\"Accountant\",\"demands\":\"Better public transport\",\"extraInfo\":\"Wants direct bus to market\",\"familyId\":\"\",\"familyIdType\":\"\",\"relationToHead\":\"\",\"headId\":\"\"}','RJ/UDR/30001','9876502001',NULL,'2025-10-15 12:09:29.539',NULL,NULL),(30,3,'SUCCESS',NULL,'{\"name\":\"Mohan Das\",\"voterId\":\"RJ/UDR/30002\",\"age\":\"38\",\"gender\":\"M\",\"village\":\"Old City\",\"houseNo\":\"9\",\"address\":\"Clock Tower Lane\",\"boothName\":\"Community Hall 1\",\"boothNo\":\"10\",\"partNo\":\"2\",\"srn\":\"302\",\"mobile1\":\"9876502002\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"OPPOSITE\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1987-11-30\",\"caste\":\"SC\",\"profession\":\"Driver\",\"demands\":\"Road repair\",\"extraInfo\":\"\",\"familyId\":\"\",\"familyIdType\":\"\",\"relationToHead\":\"\",\"headId\":\"\"}','RJ/UDR/30002','9876502002',NULL,'2025-10-15 12:09:29.550',NULL,NULL),(31,4,'SUCCESS',NULL,'{\"name\":\"Ramesh Sharma\",\"voterId\":\"RJ/UDR/10001\",\"age\":\"48\",\"gender\":\"M\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"101\",\"mobile1\":\"9876500001\",\"mobile2\":\"\",\"email\":\"ramesh@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1977-05-12\",\"caste\":\"Brahmin\",\"profession\":\"Shopkeeper\",\"demands\":\"Better street lights\",\"extraInfo\":\"Ward needs repair\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"HEAD\",\"headId\":\"\"}','RJ/UDR/10001','9876500001',33,'2025-10-15 18:54:56.758','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(32,4,'SUCCESS',NULL,'{\"name\":\"Sita Sharma\",\"voterId\":\"RJ/UDR/10002\",\"age\":\"45\",\"gender\":\"F\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"102\",\"mobile1\":\"9876500002\",\"mobile2\":\"\",\"email\":\"sita@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1980-08-22\",\"caste\":\"Brahmin\",\"profession\":\"Homemaker\",\"demands\":\"Community clinic needed\",\"extraInfo\":\"\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"SPOUSE\",\"headId\":\"\"}','RJ/UDR/10002','9876500002',34,'2025-10-15 18:54:56.767','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(33,4,'SUCCESS',NULL,'{\"name\":\"Aarav Sharma\",\"voterId\":\"RJ/UDR/10003\",\"age\":\"19\",\"gender\":\"M\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"103\",\"mobile1\":\"9876500003\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"OUR\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"2006-01-09\",\"caste\":\"Brahmin\",\"profession\":\"Student\",\"demands\":\"Sports ground\",\"extraInfo\":\"Youth club\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"CHILD\",\"headId\":\"\"}','RJ/UDR/10003','9876500003',35,'2025-10-15 18:54:56.775','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(34,4,'SUCCESS',NULL,'{\"name\":\"Shanti Devi\",\"voterId\":\"RJ/UDR/10004\",\"age\":\"70\",\"gender\":\"F\",\"village\":\"Lakshmi Nagar\",\"houseNo\":\"12-A\",\"address\":\"Near Temple Road\",\"boothName\":\"Govt School 1\",\"boothNo\":\"12\",\"partNo\":\"3\",\"srn\":\"104\",\"mobile1\":\"9876500004\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1955-03-14\",\"caste\":\"Brahmin\",\"profession\":\"Retired\",\"demands\":\"Senior citizen pass\",\"extraInfo\":\"\",\"familyId\":\"JAF-1001\",\"familyIdType\":\"JAN_AADHAAR_FAMILY_ID\",\"relationToHead\":\"PARENT\",\"headId\":\"\"}','RJ/UDR/10004','9876500004',36,'2025-10-15 18:54:56.781','JAF-1001','JAN_AADHAAR_FAMILY_ID'),(35,4,'SUCCESS',NULL,'{\"name\":\"Imran Khan\",\"voterId\":\"RJ/UDR/20001\",\"age\":\"52\",\"gender\":\"M\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"201\",\"mobile1\":\"9876501001\",\"mobile2\":\"\",\"email\":\"imran@example.com\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1973-09-01\",\"caste\":\"Muslim\",\"profession\":\"Carpenter\",\"demands\":\"Drainage improvement\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"HEAD\",\"headId\":\"\"}','RJ/UDR/20001','9876501001',37,'2025-10-15 18:54:56.787','RC-5521','RATION_CARD_NO'),(36,4,'SUCCESS',NULL,'{\"name\":\"Zara Khan\",\"voterId\":\"RJ/UDR/20002\",\"age\":\"47\",\"gender\":\"F\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"202\",\"mobile1\":\"9876501002\",\"mobile2\":\"\",\"email\":\"zara@example.com\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1978-02-11\",\"caste\":\"Muslim\",\"profession\":\"Tailor\",\"demands\":\"Women skill center\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"SPOUSE\",\"headId\":\"\"}','RJ/UDR/20002','9876501002',38,'2025-10-15 18:54:56.791','RC-5521','RATION_CARD_NO'),(37,4,'SUCCESS',NULL,'{\"name\":\"Ayesha Khan\",\"voterId\":\"RJ/UDR/20003\",\"age\":\"24\",\"gender\":\"F\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"203\",\"mobile1\":\"9876501003\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"2001-07-21\",\"caste\":\"Muslim\",\"profession\":\"Nurse\",\"demands\":\"Street lighting\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"SIBLING\",\"headId\":\"\"}','RJ/UDR/20003','9876501003',39,'2025-10-15 18:54:56.795','RC-5521','RATION_CARD_NO'),(38,4,'SUCCESS',NULL,'{\"name\":\"Kabir Khan\",\"voterId\":\"RJ/UDR/20004\",\"age\":\"16\",\"gender\":\"M\",\"village\":\"Shakti Colony\",\"houseNo\":\"221\",\"address\":\"Main Bazaar\",\"boothName\":\"Community Hall 2\",\"boothNo\":\"18\",\"partNo\":\"5\",\"srn\":\"204\",\"mobile1\":\"9876501004\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"DOUBTFUL\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"2009-12-05\",\"caste\":\"Muslim\",\"profession\":\"Student\",\"demands\":\"Playground\",\"extraInfo\":\"\",\"familyId\":\"RC-5521\",\"familyIdType\":\"RATION_CARD_NO\",\"relationToHead\":\"CHILD\",\"headId\":\"\"}','RJ/UDR/20004','9876501004',40,'2025-10-15 18:54:56.799','RC-5521','RATION_CARD_NO'),(39,4,'SUCCESS',NULL,'{\"name\":\"Priya Verma\",\"voterId\":\"RJ/UDR/30001\",\"age\":\"29\",\"gender\":\"F\",\"village\":\"Rajiv Nagar\",\"houseNo\":\"45-B\",\"address\":\"Near Park\",\"boothName\":\"Govt School 3\",\"boothNo\":\"22\",\"partNo\":\"7\",\"srn\":\"301\",\"mobile1\":\"9876502001\",\"mobile2\":\"\",\"email\":\"priya@example.com\",\"colourCode\":\"OUR\",\"voted\":\"1\",\"starVoter\":\"1\",\"dead\":\"0\",\"dob\":\"1996-04-19\",\"caste\":\"Kayastha\",\"profession\":\"Accountant\",\"demands\":\"Better public transport\",\"extraInfo\":\"Wants direct bus to market\",\"familyId\":\"\",\"familyIdType\":\"\",\"relationToHead\":\"\",\"headId\":\"\"}','RJ/UDR/30001','9876502001',41,'2025-10-15 18:54:56.804',NULL,NULL),(40,4,'SUCCESS',NULL,'{\"name\":\"Mohan Das\",\"voterId\":\"RJ/UDR/30002\",\"age\":\"38\",\"gender\":\"M\",\"village\":\"Old City\",\"houseNo\":\"9\",\"address\":\"Clock Tower Lane\",\"boothName\":\"Community Hall 1\",\"boothNo\":\"10\",\"partNo\":\"2\",\"srn\":\"302\",\"mobile1\":\"9876502002\",\"mobile2\":\"\",\"email\":\"\",\"colourCode\":\"OPPOSITE\",\"voted\":\"0\",\"starVoter\":\"0\",\"dead\":\"0\",\"dob\":\"1987-11-30\",\"caste\":\"SC\",\"profession\":\"Driver\",\"demands\":\"Road repair\",\"extraInfo\":\"\",\"familyId\":\"\",\"familyIdType\":\"\",\"relationToHead\":\"\",\"headId\":\"\"}','RJ/UDR/30002','9876502002',42,'2025-10-15 18:54:56.809',NULL,NULL);
/*!40000 ALTER TABLE `ImportRow` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('ADMIN','STAFF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STAFF',
  `phoneVerifiedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_phone_key` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User`
--

LOCK TABLES `User` WRITE;
/*!40000 ALTER TABLE `User` DISABLE KEYS */;
INSERT INTO `User` VALUES (1,'+917340497820','Kiran Rawal','STAFF','2025-10-15 11:11:20.752','2025-10-15 11:11:20.754','2025-10-15 11:11:20.754'),(2,'+917593740598','jkhdsfikfvbgds','STAFF','2025-10-15 12:27:49.655','2025-10-15 12:27:49.658','2025-10-15 12:27:49.658');
/*!40000 ALTER TABLE `User` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Voter`
--

DROP TABLE IF EXISTS `Voter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Voter` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `voterId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `age` int unsigned DEFAULT NULL,
  `gender` enum('M','F','O') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `village` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `houseNo` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `boothName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `boothNo` int unsigned DEFAULT NULL,
  `partNo` int unsigned DEFAULT NULL,
  `srn` int unsigned DEFAULT NULL,
  `mobile1` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile2` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `colourCode` enum('OUR','OPPOSITE','DOUBTFUL','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OTHER',
  `voted` tinyint(1) NOT NULL DEFAULT '0',
  `starVoter` tinyint(1) NOT NULL DEFAULT '0',
  `dead` tinyint(1) NOT NULL DEFAULT '0',
  `caste` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profession` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `demands` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dob` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `familyId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extraInfo` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `familyIdType` enum('JAN_AADHAAR_FAMILY_ID','RATION_CARD_NO','OTHER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `headId` bigint unsigned DEFAULT NULL,
  `relationToHead` enum('HEAD','SPOUSE','CHILD','PARENT','SIBLING','OTHER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_voterId` (`voterId`),
  KEY `Voter_name_idx` (`name`),
  KEY `Voter_village_idx` (`village`),
  KEY `Voter_boothNo_partNo_srn_idx` (`boothNo`,`partNo`,`srn`),
  KEY `Voter_mobile1_idx` (`mobile1`),
  KEY `Voter_mobile2_idx` (`mobile2`),
  KEY `Voter_familyId_idx` (`familyId`),
  KEY `Voter_headId_idx` (`headId`),
  FULLTEXT KEY `Voter_name_village_address_boothName_idx` (`name`,`village`,`address`,`boothName`),
  CONSTRAINT `Voter_headId_fkey` FOREIGN KEY (`headId`) REFERENCES `Voter` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Voter`
--

LOCK TABLES `Voter` WRITE;
/*!40000 ALTER TABLE `Voter` DISABLE KEYS */;
INSERT INTO `Voter` VALUES (33,'Ramesh Sharma','RJ/UDR/10001',NULL,NULL,'Lakshmi Nagar','12-A','Near Temple Road','Govt School 1',12,3,101,'9876500001',NULL,'ramesh@example.com','OUR',1,0,0,'Brahmin','Shopkeeper','Better street lights','1977-05-12 00:00:00.000','2025-10-15 18:54:56.748','2025-10-15 18:54:56.748','JAF-1001','Ward needs repair','JAN_AADHAAR_FAMILY_ID',NULL,'HEAD'),(34,'Sita Sharma','RJ/UDR/10002',NULL,NULL,'Lakshmi Nagar','12-A','Near Temple Road','Govt School 1',12,3,102,'9876500002',NULL,'sita@example.com','OUR',1,0,0,'Brahmin','Homemaker','Community clinic needed','1980-08-22 00:00:00.000','2025-10-15 18:54:56.764','2025-10-15 18:54:56.764','JAF-1001',NULL,'JAN_AADHAAR_FAMILY_ID',NULL,'SPOUSE'),(35,'Aarav Sharma','RJ/UDR/10003',NULL,NULL,'Lakshmi Nagar','12-A','Near Temple Road','Govt School 1',12,3,103,'9876500003',NULL,NULL,'OUR',0,0,0,'Brahmin','Student','Sports ground','2006-01-09 00:00:00.000','2025-10-15 18:54:56.771','2025-10-15 18:54:56.771','JAF-1001','Youth club','JAN_AADHAAR_FAMILY_ID',NULL,'CHILD'),(36,'Shanti Devi','RJ/UDR/10004',NULL,NULL,'Lakshmi Nagar','12-A','Near Temple Road','Govt School 1',12,3,104,'9876500004',NULL,NULL,'OUR',1,0,0,'Brahmin','Retired','Senior citizen pass','1955-03-14 00:00:00.000','2025-10-15 18:54:56.778','2025-10-15 18:54:56.778','JAF-1001',NULL,'JAN_AADHAAR_FAMILY_ID',NULL,'PARENT'),(37,'Imran Khan','RJ/UDR/20001',NULL,NULL,'Shakti Colony','221','Main Bazaar','Community Hall 2',18,5,201,'9876501001',NULL,'imran@example.com','DOUBTFUL',0,0,0,'Muslim','Carpenter','Drainage improvement','1973-09-01 00:00:00.000','2025-10-15 18:54:56.784','2025-10-15 18:54:56.784','RC-5521',NULL,'RATION_CARD_NO',NULL,'HEAD'),(38,'Zara Khan','RJ/UDR/20002',NULL,NULL,'Shakti Colony','221','Main Bazaar','Community Hall 2',18,5,202,'9876501002',NULL,'zara@example.com','DOUBTFUL',0,0,0,'Muslim','Tailor','Women skill center','1978-02-11 00:00:00.000','2025-10-15 18:54:56.788','2025-10-15 18:54:56.788','RC-5521',NULL,'RATION_CARD_NO',NULL,'SPOUSE'),(39,'Ayesha Khan','RJ/UDR/20003',NULL,NULL,'Shakti Colony','221','Main Bazaar','Community Hall 2',18,5,203,'9876501003',NULL,NULL,'DOUBTFUL',0,0,0,'Muslim','Nurse','Street lighting','2001-07-21 00:00:00.000','2025-10-15 18:54:56.793','2025-10-15 18:54:56.793','RC-5521',NULL,'RATION_CARD_NO',NULL,'SIBLING'),(40,'Kabir Khan','RJ/UDR/20004',NULL,NULL,'Shakti Colony','221','Main Bazaar','Community Hall 2',18,5,204,'9876501004',NULL,NULL,'DOUBTFUL',0,0,0,'Muslim','Student','Playground','2009-12-05 00:00:00.000','2025-10-15 18:54:56.797','2025-10-15 18:54:56.797','RC-5521',NULL,'RATION_CARD_NO',NULL,'CHILD'),(41,'Priya Verma','RJ/UDR/30001',NULL,NULL,'Rajiv Nagar','45-B','Near Park','Govt School 3',22,7,301,'9876502001',NULL,'priya@example.com','OUR',1,1,0,'Kayastha','Accountant','Better public transport','1996-04-19 00:00:00.000','2025-10-15 18:54:56.801','2025-10-15 18:54:56.801',NULL,'Wants direct bus to market',NULL,NULL,NULL),(42,'Mohan Das','RJ/UDR/30002',NULL,NULL,'Old City','9','Clock Tower Lane','Community Hall 1',10,2,302,'9876502002',NULL,NULL,'OPPOSITE',0,0,0,'SC','Driver','Road repair','1987-11-30 00:00:00.000','2025-10-15 18:54:56.807','2025-10-15 18:54:56.807',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `Voter` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('10a37ef4-6f86-4a42-bff1-d14c40bec8bf','cb53c0ca39fd91259cec6135502c19b0c8fca5d540056695d916b10dc22426c3','2025-10-15 10:45:15.178','20251014151245_base_with_family_links',NULL,NULL,'2025-10-15 10:45:15.147',1),('17df48f3-874b-49fa-bfce-8e696637116f','68eec44163e939b5b85f02e39e432379c473bcc3d40722a589dc793db3824827','2025-10-15 10:45:15.291','20251015101334_add_family_head_model',NULL,NULL,'2025-10-15 10:45:15.178',1),('bd9c6015-339b-452e-b7c5-1f142cb3fa1d','5e22c9a920ae50a131cb654d08835bffd7ebfc587d599bbe1891bd4b7a0f9823','2025-10-15 10:49:40.018','20251015104939_families_simple_grouping_fix_head_relation',NULL,NULL,'2025-10-15 10:49:39.871',1),('d9f5f15b-9483-4fb4-952a-4bef2bd5f553','c561e124dce14920e3211477349edb900f8ea3aa6a7c724bba5fccde939c23ed','2025-10-15 11:23:12.222','20251015112312_families_simple_grouping_fix_head_relation',NULL,NULL,'2025-10-15 11:23:12.063',1),('e07d7ad5-102d-4bd3-a859-fbe8b217ff36','accf274a7b45bb23f8268e74af5ec0fb92f680f7d8858f8230b210d957c8d69e','2025-10-15 10:45:15.146','20251014120532_init',NULL,NULL,'2025-10-15 10:45:15.044',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'voterdb'
--

--
-- Dumping routines for database 'voterdb'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-16 11:48:18
