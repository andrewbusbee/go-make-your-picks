# 🏆 Go Make Your Picks

A modern, player-friendly sports prediction platform that brings people together through friendly competition. Create seasons, predict champions, and track player picks across multiple sports.

## ✨ Features

### For Players
- **No Registration Required** - Access picks via secure email links
- **Multiple Sports** - Baseball, Basketball, Tennis, Golf, and more
- **Real-time Leaderboards** - See who's winning in real-time
- **Progress Tracking** - Visual graphs showing point accumulation over time
- **Mobile Friendly** - Works perfectly on phones, tablets, and computers

### For Administrators
- **Season Management** - Create and manage multiple competition seasons
- **Flexible Scoring** - Customize point values for different placements
- **Automated Reminders** - System sends timely reminders to players
- **User Management** - Add and manage players easily
- **Admin Controls** - Create additional admin accounts with proper permissions

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Email service credentials (Gmail, SendGrid, etc.)

### Installation

1. **Clone and navigate to the project**
   ```bash
   git clone <repository-url>
   cd go-make-your-picks
   ```

2. **Create your environment configuration**
   ```bash
   cp docker-compose.override.yml.example docker-compose.override.yml
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access your application**
   - **Main Site**: http://localhost:3003
   - **Admin Panel**: http://localhost:3003/admin/login

### First-Time Setup

**Default Admin Login:**
- Username: `user`
- Password: `password`

⚠️ **You'll be prompted to change the password on first login**

## 📋 Example Docker Compose Configuration

Here's a complete example of your `docker-compose.override.yml` file:

```yaml
# Local development configuration
# This file overrides the production image with local builds

services:
  app:
    # Use local build instead of published image
    build:
      context: .
      dockerfile: Dockerfile
    
    environment:
      # Enable development features
      ENABLE_DEV_TOOLS: "true"
      
      # Email Configuration
      SMTP_HOST: smtp.gmail.com
      SMTP_PORT: 587
      SMTP_SECURE: false
      SMTP_USER: your-email@gmail.com
      SMTP_PASSWORD: your-gmail-app-password
      SMTP_FROM: noreply@yourfamily.com
      SMTP_FROM_NAME: "Your League Picks"
      
      # Application Settings
      APP_URL: http://localhost:3003
      
      # Security (generate a strong secret!)
      JWT_SECRET: your-super-secure-jwt-secret-here
      
      # Optional: Custom database passwords
      # DB_PASSWORD: your-custom-password
      # MYSQL_PASSWORD: your-custom-password
```

## ⚙️ Environment Variables

### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | Email server hostname | `smtp.gmail.com` |
| `SMTP_USER` | Email account username | `your-email@gmail.com` |
| `SMTP_PASSWORD` | Email account password/app password | `your-app-password` |
| `SMTP_FROM` | Sender email address | `noreply@yourfamily.com` |
| `SMTP_FROM_NAME` | Display name for emails | `"Your League"` |
| `APP_URL` | Your application's public URL | `http://localhost:3003` |
| `JWT_SECRET` | Secret key for admin authentication | `generate-a-strong-random-string` |

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_SECURE` | Use SSL/TLS encryption | `false` |
| `ENABLE_DEV_TOOLS` | Show development tools in admin | `false` |
| `MYSQL_DATABASE` | Database name | `sports_picks` |
| `MYSQL_USER` | Database username | `picksuser` |
| `MYSQL_PASSWORD` | Database password | `pickspass` |

### Email Provider Examples

**Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Brevo (formerly Sendinblue):**
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-brevo-smtp-key
```

## 📧 Email Setup Guide

### Gmail Configuration

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account → Security
   - App passwords → Select "Mail" and your device
   - Copy the generated 16-character password
3. **Use the app password** in your `SMTP_PASSWORD` variable

### Testing Email Configuration

Use the built-in email test feature in the admin panel:
1. Go to **Settings** → **Test Email**
2. Enter your email address
3. Click "Send Test Email"

## 🎯 Getting Started Guide

### For Administrators

1. **Login** to the admin panel with your credentials
2. **Change your password** when prompted
3. **Add players** in the "Players" section
4. **Create a season** (e.g., "2025 League Championship")
5. **Add sports/rounds** for your season:
   - Set sport name and lock date
   - Add available teams or enable write-in picks
   - Include a custom message for players
6. **Activate rounds** to send magic links to everyone
7. **Complete rounds** after championships to calculate scores

### For Players

1. **Check your email** for magic link invitations
2. **Click the link** to access your pick form
3. **Make your predictions** before the lock time
4. **Update your picks** anytime before the deadline
5. **View the leaderboard** to see how everyone is doing

## 🔧 Development Setup

### With Docker (Recommended)

```bash
# Use the override file for local development
cp docker-compose.override.yml.example docker-compose.override.yml
# Edit with your settings, then:
docker-compose up -d
```

### Without Docker

1. **Install dependencies**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Setup MySQL database**:
   - Create database and run `backend/database/init.sql`

3. **Configure environment**:
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend (new terminal)
   cd frontend
   npm run dev
   ```

## 🛠️ Technical Details

### Architecture
- **Frontend**: React 18 with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express and TypeScript
- **Database**: MySQL 8.0 with comprehensive schema
- **Email**: Configurable SMTP with automatic retry logic
- **Deployment**: Docker containers with health checks

### Security Features
- JWT-based admin authentication
- Magic link tokens for family member access
- Bcrypt password hashing
- SQL injection protection
- CORS configuration
- Input validation and sanitization

### API Endpoints

**Public Endpoints:**
- `GET /api/seasons` - List all seasons
- `GET /api/leaderboard/season/:id` - Get season leaderboard
- `GET /api/picks/validate/:token` - Validate magic link
- `POST /api/picks/:token` - Submit pick via magic link

**Admin Endpoints (Authentication Required):**
- `POST /api/auth/login` - Admin login
- `GET /api/users` - Manage players
- `POST /api/rounds` - Create sports rounds
- `POST /api/rounds/:id/activate` - Send magic links
- `POST /api/rounds/:id/complete` - Complete round and score

## 🔍 Troubleshooting

### Common Issues

**Magic Links Not Sending:**
- Verify SMTP credentials in your configuration
- Check that your email provider allows SMTP connections
- Use the built-in email test feature in admin settings

**Database Connection Problems:**
- Ensure MySQL container is running: `docker-compose ps`
- Wait for database initialization (30-60 seconds on first start)
- Verify database credentials match your configuration

**Port Conflicts:**
```bash
# Check what's using port 3003
lsof -i :3003  # macOS/Linux
netstat -ano | findstr :3003  # Windows
```

### Getting Help

- Check the application logs: `docker-compose logs app`
- Review the troubleshooting section above
- Open an issue on the repository with details about your setup

## 📄 License

MIT License - feel free to use this for your league's fun and competition!

---

**Built with ❤️ for bringing people together through friendly competition.**