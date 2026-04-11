# Deployment Guide

This guide covers deploying the Finan application in different environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Management](#database-management)
- [Security Considerations](#security-considerations)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js**: v14 or higher
- **Docker**: v20 or higher
- **Docker Compose**: v2 or higher
- **Git**: For version control

### Recommended Tools
- **PM2**: Process manager for production
- **Nginx**: Reverse proxy
- **Let's Encrypt**: SSL certificates

## Local Development

### Quick Start

1. **Clone and Install**:
```bash
git clone https://github.com/Hstar1994/Finan.git
cd Finan
npm install
```

2. **Configure Environment**:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start Database**:
```bash
docker compose up -d
```

4. **Initialize Database**:
```bash
npm run db:migrate
npm run db:seed
```

5. **Start Application**:
```bash
npm run dev
```

Access the application at http://localhost:3000

### Development Workflow

**Hot Reload**:
```bash
npm run dev  # Uses nodemon for auto-restart
```

**Manual Restart**:
```bash
npm start
```

**Stop Database**:
```bash
docker compose down
```

**Reset Database**:
```bash
docker compose down -v  # Removes volumes
docker compose up -d
npm run db:migrate
npm run db:seed
```

## Production Deployment

### Method 1: Manual Deployment

#### 1. Server Setup

**Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Install Docker**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Install PM2**:
```bash
sudo npm install -g pm2
```

#### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/Hstar1994/Finan.git
cd Finan

# Install dependencies
npm install --production

# Setup environment
cp .env.example .env
nano .env  # Edit with production values
```

#### 3. Database Setup

```bash
# Start PostgreSQL
docker compose up -d

# Wait for database to be ready
sleep 10

# Run migrations
npm run db:migrate

# Optional: Seed initial data
npm run db:seed
```

#### 4. Start Application

```bash
# Start with PM2
pm2 start src/server.js --name finan-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### 5. Configure Nginx

Create `/etc/nginx/sites-available/finan`:

```nginx
server {
    listen 80;
    server_name api.yourcompany.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/finan /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Setup SSL

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourcompany.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### Method 2: Docker Deployment

#### 1. Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "src/server.js"]
```

#### 2. Create docker-compose.prod.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: finan-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
    networks:
      - finan-network

  postgres:
    image: postgres:15-alpine
    container_name: finan-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - finan-network

  nginx:
    image: nginx:alpine
    container_name: finan-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - finan-network

networks:
  finan-network:
    driver: bridge

volumes:
  postgres_data:
```

#### 3. Deploy

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Method 3: Cloud Platforms

#### Heroku

```bash
# Login
heroku login

# Create app
heroku create finan-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-strong-secret

# Deploy
git push heroku main

# Run migrations
heroku run npm run db:migrate

# Open app
heroku open
```

#### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create finan-production

# Deploy
eb deploy

# Open app
eb open
```

#### DigitalOcean App Platform

1. Create new app in DigitalOcean dashboard
2. Connect GitHub repository
3. Configure build command: `npm install`
4. Configure run command: `node src/server.js`
5. Add PostgreSQL database
6. Set environment variables
7. Deploy

## Environment Configuration

### Production .env

```env
# Application
NODE_ENV=production
PORT=3000

# Database (Use strong passwords)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=finan_production
DB_USER=finan_user
DB_PASSWORD=strong-random-password-here

# JWT (Use strong secret)
JWT_SECRET=very-strong-random-secret-at-least-32-characters
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=https://app.yourcompany.com,https://www.yourcompany.com
```

### Generate Strong Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate database password
openssl rand -base64 32
```

## Database Management

### Backups

#### Manual Backup

```bash
# Backup database
docker exec finan-db pg_dump -U finan -d finan_db > backup.sql

# Restore database
docker exec -i finan-db psql -U finan -d finan_db < backup.sql
```

#### Automated Backups

Create `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/finan"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/finan_backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR
docker exec finan-db pg_dump -U finan -d finan_db > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Setup cron:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

### Database Migrations

```bash
# Create new migration
# Edit src/database/models to add/modify models

# Apply migrations
npm run db:migrate

# In production with Docker
docker-compose exec app npm run db:migrate
```

## Security Considerations

### Pre-Deployment Checklist

- [ ] Update JWT_SECRET to strong random value
- [ ] Use strong database passwords
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Configure CORS properly
- [ ] Set NODE_ENV=production
- [ ] Review rate limiting settings
- [ ] Disable debug logging
- [ ] Setup firewall rules
- [ ] Regular security updates
- [ ] Database connection encryption

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### SSL/TLS Best Practices

- Use Let's Encrypt for free certificates
- Enable HTTP/2
- Configure strong cipher suites
- Enable HSTS
- Redirect HTTP to HTTPS

## Monitoring

### PM2 Monitoring

```bash
# View processes
pm2 list

# View logs
pm2 logs finan-api

# Monitor resources
pm2 monit

# View detailed info
pm2 info finan-api
```

### Application Logs

```bash
# With PM2
pm2 logs finan-api --lines 100

# With Docker
docker-compose logs -f app
docker-compose logs -f postgres
```

### Health Checks

```bash
# Application health
curl http://localhost:3000/api/health

# Database health
docker exec finan-db pg_isready -U finan
```

### Monitoring Tools

**Recommended Tools**:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry, Rollbar
- **Performance monitoring**: New Relic, DataDog
- **Log management**: Loggly, Papertrail

## Troubleshooting

### Application won't start

**Check logs**:
```bash
pm2 logs finan-api --err
# or
docker-compose logs app
```

**Common issues**:
1. Database not ready: Wait 10 seconds after starting
2. Port in use: Change PORT in .env
3. Missing .env: Copy from .env.example

### Database connection errors

**Check database status**:
```bash
docker-compose ps
docker-compose logs postgres
```

**Test connection**:
```bash
docker exec -it finan-db psql -U finan -d finan_db -c "SELECT 1"
```

**Reset database**:
```bash
docker-compose down -v
docker-compose up -d
sleep 10
npm run db:migrate
```

### High memory usage

**Check process**:
```bash
pm2 monit
# or
docker stats
```

**Solutions**:
1. Increase server resources
2. Enable connection pooling (already configured)
3. Optimize queries
4. Add indexes to database

### Performance issues

**Database optimization**:
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Analyze tables
ANALYZE;

-- Vacuum database
VACUUM FULL;
```

## Updates and Maintenance

### Updating Application

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install --production

# Run migrations
npm run db:migrate

# Restart application
pm2 restart finan-api
```

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Test thoroughly
npm start
```

### Database Maintenance

```bash
# Weekly maintenance (create cron job)
docker exec finan-db psql -U finan -d finan_db -c "VACUUM ANALYZE"

# Check database size
docker exec finan-db psql -U finan -d finan_db -c "SELECT pg_size_pretty(pg_database_size('finan_db'))"
```

## Rollback Procedure

If deployment fails:

1. **Revert code**:
```bash
git log  # Find previous commit
git checkout <previous-commit>
pm2 restart finan-api
```

2. **Restore database**:
```bash
docker exec -i finan-db psql -U finan -d finan_db < backup.sql
```

3. **Verify**:
```bash
curl http://localhost:3000/api/health
```

## Support

For deployment issues:
1. Check logs first
2. Verify environment configuration
3. Test database connectivity
4. Review firewall rules
5. Check disk space and resources

For additional help, open an issue on GitHub.
