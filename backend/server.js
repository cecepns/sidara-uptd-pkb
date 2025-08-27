import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

// Set default JWT_SECRET if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'sidara-uptd-pkb-secret-key-2024';
  console.log('⚠️  JWT_SECRET not set, using default key. Please set JWT_SECRET in production.');
}

// Set default JWT_EXPIRES_IN if not provided
if (!process.env.JWT_EXPIRES_IN) {
  process.env.JWT_EXPIRES_IN = '7d';
  console.log('⚠️  JWT_EXPIRES_IN not set, using default value: 7d');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, process.env.UPLOAD_PATH || './uploads-sidara-uptd-pkb');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(uploadDir));

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sidara_uptd_pkb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Routes

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND status = "active"',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Dashboard Routes
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Get total archives
    const [totalArchives] = await pool.execute('SELECT COUNT(*) as count FROM archives');
    
    // Get user's archives
    const [myArchives] = await pool.execute(
      'SELECT COUNT(*) as count FROM archives WHERE uploader_id = ?',
      [userId]
    );

    // Get archives by category
    const [categoryStats] = await pool.execute(`
      SELECT 
        category,
        COUNT(*) as count
      FROM archives 
      GROUP BY category
    `);

    const categories = {
      kendaraan: 0,
      staf: 0,
      inventaris: 0
    };

    categoryStats.forEach(stat => {
      if (categories.hasOwnProperty(stat.category)) {
        categories[stat.category] = stat.count;
      }
    });

    let totalUsers = 0;
    if (isAdmin) {
      const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE status = "active"');
      totalUsers = userCount[0].count;
    }

    // Get this month's archives count
    const [thisMonth] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM archives 
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
      ${!isAdmin ? 'AND uploader_id = ?' : ''}
    `, !isAdmin ? [userId] : []);

    res.json({
      totalArchives: totalArchives[0].count,
      myArchives: myArchives[0].count,
      totalUsers,
      categories,
      thisMonth: thisMonth[0].count
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/dashboard/recent-archives', authenticateToken, async (req, res) => {
  try {
    const [archives] = await pool.execute(`
      SELECT a.*, u.name as uploader_name
      FROM archives a
      JOIN users u ON a.uploader_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

    res.json(archives);
  } catch (error) {
    console.error('Recent archives error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Archive Routes
app.get('/api/archives', authenticateToken, async (req, res) => {
  try {
    const [archives] = await pool.execute(`
      SELECT a.*, u.name as uploader_name
      FROM archives a
      JOIN users u ON a.uploader_id = u.id
      ORDER BY a.created_at DESC
    `);

    res.json(archives);
  } catch (error) {
    console.error('Get archives error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/archives', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const [result] = await pool.execute(`
      INSERT INTO archives (title, description, category, filename, original_filename, file_size, mime_type, uploader_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      description,
      category,
      file.filename,
      file.originalname,
      file.size,
      file.mimetype,
      req.user.id
    ]);

    res.status(201).json({
      message: 'Archive uploaded successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Upload archive error:', error);
    
    // Delete uploaded file if database insert fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/archives/:id/download', authenticateToken, async (req, res) => {
  try {
    const archiveId = req.params.id;

    const [archives] = await pool.execute(
      'SELECT * FROM archives WHERE id = ?',
      [archiveId]
    );

    if (archives.length === 0) {
      return res.status(404).json({ message: 'Archive not found' });
    }

    const archive = archives[0];
    const filePath = path.join(uploadDir, archive.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${archive.original_filename}"`);
    res.setHeader('Content-Type', archive.mime_type);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/archives/:id', authenticateToken, async (req, res) => {
  try {
    const archiveId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const [archives] = await pool.execute(
      'SELECT * FROM archives WHERE id = ?',
      [archiveId]
    );

    if (archives.length === 0) {
      return res.status(404).json({ message: 'Archive not found' });
    }

    const archive = archives[0];

    // Check permission
    if (!isAdmin && archive.uploader_id !== userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Delete file from filesystem
    const filePath = path.join(uploadDir, archive.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await pool.execute('DELETE FROM archives WHERE id = ?', [archiveId]);

    res.json({ message: 'Archive deleted successfully' });
  } catch (error) {
    console.error('Delete archive error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// User Management Routes (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT id, username, name, email, role, status, created_at, last_login
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, name, email, password, role } = req.body;

    if (!username || !name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if username already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(`
      INSERT INTO users (username, name, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [username, name, email, hashedPassword, role]);

    res.status(201).json({
      message: 'User created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, name, email, role, status } = req.body;

    if (!username || !name || !email || !role || !status) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if username already exists for other users
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    await pool.execute(`
      UPDATE users SET username = ?, name = ?, email = ?, role = ?, status = ?
      WHERE id = ?
    `, [username, name, email, role, status, userId]);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Don't allow admin to delete themselves
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Profile Routes
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, name, email, role, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // If changing password, verify current password
    if (newPassword) {
      const [users] = await pool.execute(
        'SELECT password FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const validPassword = await bcrypt.compare(currentPassword, users[0].password);
      if (!validPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    // Update user
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.execute(
        'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
        [name, email, hashedPassword, req.user.id]
      );
    } else {
      await pool.execute(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name, email, req.user.id]
      );
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reports Routes (Admin only)
app.get('/api/reports/archives', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    let dateParams = [];
    
    if (period === 'month') {
      dateFilter = 'WHERE MONTH(a.created_at) = MONTH(CURRENT_DATE()) AND YEAR(a.created_at) = YEAR(CURRENT_DATE())';
    } else if (period === 'year') {
      dateFilter = 'WHERE YEAR(a.created_at) = YEAR(CURRENT_DATE())';
    }

    const [archives] = await pool.execute(`
      SELECT 
        a.*,
        u.name as uploader_name
      FROM archives a
      JOIN users u ON a.uploader_id = u.id
      ${dateFilter}
      ORDER BY a.created_at DESC
    `, dateParams);

    // Get category statistics with proper date filtering
    let categoryDateFilter = '';
    if (period === 'month') {
      categoryDateFilter = 'WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())';
    } else if (period === 'year') {
      categoryDateFilter = 'WHERE YEAR(created_at) = YEAR(CURRENT_DATE())';
    }

    const [categoryStats] = await pool.execute(`
      SELECT 
        category,
        COUNT(*) as count
      FROM archives 
      ${categoryDateFilter}
      GROUP BY category
    `);

    // Get uploader statistics with proper date filtering
    let uploaderDateFilter = '';
    if (period === 'month') {
      uploaderDateFilter = 'AND MONTH(a.created_at) = MONTH(CURRENT_DATE()) AND YEAR(a.created_at) = YEAR(CURRENT_DATE())';
    } else if (period === 'year') {
      uploaderDateFilter = 'AND YEAR(a.created_at) = YEAR(CURRENT_DATE())';
    }

    const [uploaderStats] = await pool.execute(`
      SELECT 
        u.name as uploader_name,
        COUNT(a.id) as upload_count
      FROM users u
      LEFT JOIN archives a ON u.id = a.uploader_id ${uploaderDateFilter}
      GROUP BY u.id, u.name
      ORDER BY upload_count DESC
    `);

    res.json({
      archives,
      categoryStats,
      uploaderStats,
      period
    });
  } catch (error) {
    console.error('Get reports error:', error);
    console.error('Error details:', error.message);
    console.error('SQL State:', error.sqlState);
    console.error('Error Code:', error.errno);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Archive Edit Route
app.put('/api/archives/:id', authenticateToken, async (req, res) => {
  try {
    const archiveId = req.params.id;
    const { title, description, category } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if archive exists and user has permission
    const [archives] = await pool.execute(
      'SELECT * FROM archives WHERE id = ?',
      [archiveId]
    );

    if (archives.length === 0) {
      return res.status(404).json({ message: 'Archive not found' });
    }

    const archive = archives[0];

    // Check permission
    if (!isAdmin && archive.uploader_id !== userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Update archive
    await pool.execute(`
      UPDATE archives 
      SET title = ?, description = ?, category = ?, updated_at = NOW()
      WHERE id = ?
    `, [title, description, category, archiveId]);

    res.json({ message: 'Archive updated successfully' });
  } catch (error) {
    console.error('Update archive error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/archives/:id', authenticateToken, async (req, res) => {
  try {
    const archiveId = req.params.id;

    const [archives] = await pool.execute(`
      SELECT a.*, u.name as uploader_name
      FROM archives a
      JOIN users u ON a.uploader_id = u.id
      WHERE a.id = ?
    `, [archiveId]);

    if (archives.length === 0) {
      return res.status(404).json({ message: 'Archive not found' });
    }

    res.json(archives[0]);
  } catch (error) {
    console.error('Get archive error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large (max 10MB)' });
    }
  }
  
  if (error.message === 'File type not allowed') {
    return res.status(400).json({ message: 'File type not allowed' });
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SIDARA UPTD-PKB Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Graceful shutdown initiated...');
  await pool.end();
  console.log('✅ Database connection closed');
  process.exit(0);
});