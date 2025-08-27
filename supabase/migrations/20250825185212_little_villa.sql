-- SIDARA UPTD-PKB Database Schema
-- Sistem Digitalisasi Arsip UPTD-PKB
-- Created: 2025

CREATE DATABASE IF NOT EXISTS sidara_uptd_pkb;
USE sidara_uptd_pkb;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

-- Archives Table
CREATE TABLE archives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('kendaraan', 'staf', 'inventaris') NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploader_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_category (category),
    INDEX idx_uploader (uploader_id),
    INDEX idx_created_at (created_at),
    INDEX idx_title (title),
    
    FULLTEXT KEY ft_title_description (title, description)
);

-- User Sessions Table (optional - for tracking active sessions)
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
);

-- System Settings Table (untuk konfigurasi aplikasi)
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);

-- Insert Default Admin User
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (username, password, name, email, role, status) VALUES 
('admin', '$2a$12$rQFMPyEf7zH6ZYRXAf3z6eRMk.kkS8qVl2BbGzwZqo7o.VKk7Jn0S', 'Administrator', 'admin@uptd-pkb.go.id', 'admin', 'active');

-- Insert Default Regular User
-- Password: user123 (hashed with bcrypt)  
INSERT INTO users (username, password, name, email, role, status) VALUES 
('user', '$2a$12$8pW3VsVLQxVOWGOz1gNPCOVMF.LzK7eQ5yOjA1KE7GbkIzGqHHrni', 'User Demo', 'user@uptd-pkb.go.id', 'user', 'active');

-- Insert Sample Users
INSERT INTO users (username, password, name, email, role, status) VALUES 
('budi_santoso', '$2a$12$8pW3VsVLQxVOWGOz1gNPCOVMF.LzK7eQ5yOjA1KE7GbkIzGqHHrni', 'Budi Santoso', 'budi@uptd-pkb.go.id', 'user', 'active'),
('siti_nurhaliza', '$2a$12$8pW3VsVLQxVOWGOz1gNPCOVMF.LzK7eQ5yOjA1KE7GbkIzGqHHrni', 'Siti Nurhaliza', 'siti@uptd-pkb.go.id', 'user', 'active'),
('ahmad_wijaya', '$2a$12$8pW3VsVLQxVOWGOz1gNPCOVMF.LzK7eQ5yOjA1KE7GbkIzGqHHrni', 'Ahmad Wijaya', 'ahmad@uptd-pkb.go.id', 'user', 'active');

-- Insert Default System Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('app_name', 'SIDARA UPTD-PKB', 'Nama aplikasi'),
('app_version', '1.0.0', 'Versi aplikasi'),
('max_file_size', '10485760', 'Maksimal ukuran file upload (bytes)'),
('allowed_file_types', 'pdf,doc,docx,jpg,jpeg,png,xls,xlsx', 'Tipe file yang diizinkan'),
('records_per_page', '10', 'Jumlah record per halaman'),
('backup_retention_days', '30', 'Jumlah hari penyimpanan backup'),
('maintenance_mode', 'false', 'Mode maintenance aplikasi');

-- Insert Sample Archives (optional - untuk testing)
INSERT INTO archives (title, description, category, filename, original_filename, file_size, mime_type, uploader_id) VALUES 
('Dokumen Uji Berkala Kendaraan B1234AB', 'Hasil uji berkala kendaraan dinas tahun 2024', 'kendaraan', 'sample_kendaraan.pdf', 'Uji_Berkala_B1234AB_2024.pdf', 1048576, 'application/pdf', 2),
('Data Pegawai Tahun 2024', 'Daftar lengkap pegawai UPTD-PKB periode 2024', 'staf', 'sample_staf.xlsx', 'Data_Pegawai_2024.xlsx', 2097152, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 2),
('Inventaris Peralatan Uji', 'Daftar inventaris peralatan uji kendaraan bermotor', 'inventaris', 'sample_inventaris.docx', 'Inventaris_Peralatan_2024.docx', 1572864, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 3);

-- Create Views for Reporting
CREATE VIEW archive_stats_view AS
SELECT 
    category,
    COUNT(*) as total_files,
    SUM(file_size) as total_size,
    AVG(file_size) as avg_size,
    MIN(created_at) as first_upload,
    MAX(created_at) as last_upload
FROM archives 
GROUP BY category;

CREATE VIEW user_activity_view AS
SELECT 
    u.id,
    u.username,
    u.name,
    u.role,
    COUNT(a.id) as total_uploads,
    SUM(a.file_size) as total_upload_size,
    MIN(a.created_at) as first_upload,
    MAX(a.created_at) as last_upload,
    u.last_login
FROM users u
LEFT JOIN archives a ON u.id = a.uploader_id
WHERE u.status = 'active'
GROUP BY u.id, u.username, u.name, u.role, u.last_login;

-- Create Stored Procedures for Common Operations

-- Procedure untuk cleanup expired sessions
DELIMITER //
CREATE PROCEDURE CleanupExpiredSessions()
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END //
DELIMITER ;

-- Procedure untuk backup archive info
DELIMITER //
CREATE PROCEDURE BackupArchiveInfo(IN backup_date DATE)
BEGIN
    DECLARE backup_table_name VARCHAR(100);
    SET backup_table_name = CONCAT('archives_backup_', DATE_FORMAT(backup_date, '%Y_%m_%d'));
    
    SET @sql = CONCAT('CREATE TABLE ', backup_table_name, ' AS SELECT * FROM archives WHERE DATE(created_at) <= ?');
    PREPARE stmt FROM @sql;
    SET @backup_date = backup_date;
    EXECUTE stmt USING @backup_date;
    DEALLOCATE PREPARE stmt;
END //
DELIMITER ;

-- Event untuk cleanup otomatis (jika MySQL Events diaktifkan)
-- CREATE EVENT IF NOT EXISTS cleanup_expired_sessions
-- ON SCHEDULE EVERY 1 DAY
-- STARTS CURRENT_DATE + INTERVAL 1 DAY
-- DO CALL CleanupExpiredSessions();

-- Indexes untuk optimasi query
CREATE INDEX idx_archives_category_date ON archives(category, created_at);
CREATE INDEX idx_archives_uploader_date ON archives(uploader_id, created_at);
CREATE INDEX idx_users_role_status ON users(role, status);

-- Triggers untuk audit log (optional)
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    record_id INT NOT NULL,
    user_id INT,
    old_values JSON,
    new_values JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_table_name (table_name),
    INDEX idx_operation (operation),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp)
);

-- Trigger untuk audit archives
DELIMITER //
CREATE TRIGGER audit_archives_insert 
AFTER INSERT ON archives
FOR EACH ROW 
BEGIN
    INSERT INTO audit_logs (table_name, operation, record_id, user_id, new_values)
    VALUES ('archives', 'INSERT', NEW.id, NEW.uploader_id, 
            JSON_OBJECT('title', NEW.title, 'category', NEW.category, 'filename', NEW.filename));
END //

CREATE TRIGGER audit_archives_update
AFTER UPDATE ON archives  
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (table_name, operation, record_id, user_id, old_values, new_values)
    VALUES ('archives', 'UPDATE', NEW.id, NEW.uploader_id,
            JSON_OBJECT('title', OLD.title, 'category', OLD.category, 'description', OLD.description),
            JSON_OBJECT('title', NEW.title, 'category', NEW.category, 'description', NEW.description));
END //

CREATE TRIGGER audit_archives_delete
AFTER DELETE ON archives
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (table_name, operation, record_id, user_id, old_values)
    VALUES ('archives', 'DELETE', OLD.id, OLD.uploader_id,
            JSON_OBJECT('title', OLD.title, 'category', OLD.category, 'filename', OLD.filename));
END //
DELIMITER ;

-- Optimize tables
OPTIMIZE TABLE users;
OPTIMIZE TABLE archives; 
OPTIMIZE TABLE user_sessions;
OPTIMIZE TABLE system_settings;

-- Show table information
SHOW TABLE STATUS;

-- Grant permissions (adjust as needed for production)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sidara_uptd_pkb.* TO 'app_user'@'localhost' IDENTIFIED BY 'your_password';
-- FLUSH PRIVILEGES;

-- End of database schema
SELECT 'SIDARA UPTD-PKB Database Schema Created Successfully!' as Status;