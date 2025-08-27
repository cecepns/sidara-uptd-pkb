# SIDARA UPTD-PKB Backend

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Configuration
Create a `.env` file in the backend directory with the following content:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=sidara_uptd_pkb

# JWT Configuration
JWT_SECRET=sidara-uptd-pkb-secret-key-2024
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=./uploads-sidara-uptd-pkb
MAX_FILE_SIZE=10485760

# Server Configuration
PORT=5000
```

### 3. Setup Database
Run the following commands in order:

```bash
# Setup database and tables
node setup-database.js

# Add sample data (optional)
node add-sample-data.js

# Test database connection
node check-database.js

# Test reports functionality
node test-reports.js
```

### 4. Start Server
```bash
node server.js
```

## Troubleshooting Reports 500 Error

If you encounter a 500 error when accessing the reports page:

1. **Check Database Connection**
   ```bash
   node check-database.js
   ```

2. **Verify Database Schema**
   ```bash
   node setup-database.js
   ```

3. **Add Sample Data**
   ```bash
   node add-sample-data.js
   ```

4. **Test Reports Query**
   ```bash
   node test-reports.js
   ```

5. **Check Server Logs**
   Look for detailed error messages in the server console when accessing the reports endpoint.

## Common Issues

### Issue: Reports returning 500 error
**Solution**: 
- Ensure database is running and accessible
- Verify tables exist and have data
- Check database user permissions

### Issue: No data in reports
**Solution**:
- Run `node add-sample-data.js` to add test data
- Verify archives table has records

### Issue: Authentication errors
**Solution**:
- Ensure JWT_SECRET is set in environment
- Check user role permissions (reports require admin role)

## API Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/archives` - List all archives
- `POST /api/archives` - Upload new archive
- `GET /api/reports/archives` - Generate reports (admin only)
- `GET /api/users` - List users (admin only)

## Default Users

- **Admin**: username: `admin`, password: `admin123`
- **User**: username: `user`, password: `user123`
