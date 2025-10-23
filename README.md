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



### First-Time Setup

**Default Admin Login:**
- Username: `admin@example.com`
- Password: `password`

⚠️ **You'll be prompted to change the password on first login**

## 🐳 Installation via Docker Compose (Recommended)

The application is designed to run with Docker Compose, providing a complete stack with MariaDB database and the application server. This approach ensures consistent deployment across different environments and simplifies setup.

**Key Benefits:**
- **One-command deployment** with `docker-compose up`
- **Automatic database initialization** with schema and default data
- **Health checks** ensure services start in the correct order
- **Environment isolation** with containerized services
- **Easy scaling** and maintenance


```yaml
services:
  mariadb:
    image: mariadb:11.8
    container_name: mariadb
    restart: always
    networks:
      - go-make-your-picks-network
    environment:
      MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD}
      MARIADB_DATABASE: ${MARIADB_DATABASE}
      MARIADB_USER: ${MARIADB_USER}
      MARIADB_PASSWORD: ${MARIADB_PASSWORD}
    volumes:
      - mariadb-data:/var/lib/mysql
    # Database port - REMOVED FOR SECURITY
    # MariaDB is accessible via Docker network (mariadb:3306) - no external exposure needed
    # Uncomment below ONLY for local debugging with database admin tools
    # ports:
    #   - "127.0.0.1:3306:3306"  # Only accessible from VM localhost, not internet
    healthcheck:
      test: ["CMD", "mariadb-admin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  go-make-your-picks:
    image: ghcr.io/andrewbusbee/go-make-your-picks:latest
    container_name: go-make-your-picks
    restart: always
    networks:
      - go-make-your-picks-network
    ports:
      - "3003:3003"
    environment:
      NODE_ENV: production
      PORT: 3003
      MARIADB_HOST: mariadb
      MARIADB_PORT: 3306
      MARIADB_DATABASE: ${MARIADB_DATABASE}
      MARIADB_USER: ${MARIADB_USER}
      MARIADB_PASSWORD: ${MARIADB_PASSWORD}
      # ⚠️ CRITICAL SECURITY: Generate a strong JWT secret!
      # Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
      # Or use .env file override (recommended)
      JWT_SECRET: ${JWT_SECRET}
      # Log Level Configuration
      # Available levels: DEBUG, INFO, WARN, ERROR, FATAL, SILENT
      # Production default: INFO (shows info, warn, error, fatal)
      # Development: DEBUG (shows all logs)
      # Set LOG_LEVEL in .env file or override in docker-compose.override.yml
      LOG_LEVEL: ${LOG_LEVEL}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_SECURE: ${SMTP_SECURE}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      APP_URL: ${APP_URL}
      ENABLE_DEV_TOOLS: ${ENABLE_DEV_TOOLS}
    depends_on:
      mariadb:
        condition: service_healthy

networks:
  go-make-your-picks-network:
    driver: bridge
    internal: false  # false required for magic link functionality

volumes:
  mariadb-data:
```

## ⚙️ Environment Variables

### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | Email server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_SECURE` | Use SSL/TLS encryption | `false` |
| `SMTP_USER` | Email account username | `your-email@gmail.com` |
| `SMTP_PASSWORD` | Email account password/app password | `your-app-password` |
| `SMTP_FROM` | Sender email address | `noreply@yourfamily.com` |
| `APP_URL` | Your application's public URL | `http://localhost:3003` |
| `JWT_SECRET` | Secret key for admin authentication | `generate-a-strong-random-string` |


| `ENABLE_DEV_TOOLS` | Show development tools in admin | `false` |
| `MARIADB_DATABASE` | Database name | `gomakeyourpicks` |
| `MARIADB_USER` | Database username | `gomakeyourpicksuser` |
| `MARIADB_PASSWORD` | Database password | `your-secure-password` |
| `MARIADB_HOST` | Database host | `mariadb` |
| `MARIADB_PORT` | Database port | `3306` |

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



## 🛠️ Technical Details

### Architecture
- **Frontend**: React 18 with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express and TypeScript
- **Database**: MariaDB 11.8 LTS with comprehensive schema
- **Email**: Configurable SMTP with automatic retry logic
- **Deployment**: Docker containers with health checks

### Security Features
- JWT-based admin authentication
- Magic link tokens for family member access
- Bcrypt password hashing
- SQL injection protection
- CORS configuration
- Input validation and sanitization

## API Documentation

Complete API documentation is available at `http://localhost:3003/api/docs` - this provides a comprehensive list of all available endpoints, their methods, required parameters, and response formats.

## 🔍 Troubleshooting

### Common Issues

**Magic Links Not Sending:**
- Verify SMTP credentials in your configuration
- Check that your email provider allows SMTP connections
- Use the built-in email test feature in admin settings

**Database Connection Problems:**
- Ensure MariaDB container is running: `docker-compose ps`
- Wait for database initialization (30-60 seconds on first start)
- Verify database credentials match your configuration

## 📄 License

This project is licensed under the [MIT License](./LICENSE).  
You are free to use, modify, and distribute this software for any purpose.  
Future versions of this project may be relicensed under a different model if use cases emerge.

---

## 🤖 AI-Assisted Development

This project was built with the support of modern **AI coding tools** to accelerate prototyping and implementation.  
- AI was used to generate scaffolding, boilerplate, and draft functions.  
- All code has been **curated, reviewed, and tested** by a human before release.  
- The use of AI allowed for faster iteration and a focus on architecture, usability, and overall project quality.  