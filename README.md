# Airfield Operations Management System

A production-ready, multi-tenant web application for real-time airfield operations management. Built for Air Traffic Control (ATC) teams and airport operations staff.

## Features

### Multi-Tenant Architecture
- Support for multiple airports in a single deployment
- Complete data isolation between tenants
- Centralized super admin management

### Role-Based Access Control
- **Super Admin**: System-wide management, can create airports and manage all users
- **Admin (ATC)**: Full operational access for their airport, can manage viewers
- **Viewer**: Read-only access to operational data

### Real-Time Operations Management
- Interactive airfield map with SVG-based visualization
- Taxiway and runway status management (Open/Closed/WIP)
- Work In Progress (WIP) scheduling with automatic activation
- Low visibility operations mode
- Snow/Ice closure management
- Runway condition inspections (RCC 0-6)
- Real-time operational notices and alerts

### Audit and Compliance
- Complete operations timeline
- Filterable audit trail (7 days to all-time)
- PDF export for regulatory compliance
- Automatic notice generation for status changes

### Security
- NextAuth.js authentication
- Bcrypt password hashing
- JWT session management
- Row-Level Security (RLS) in PostgreSQL
- Protected API routes

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, PostgreSQL
- **Authentication**: NextAuth.js v4
- **Database**: Neon PostgreSQL (serverless)
- **Deployment**: Railway
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Git

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd airfield-ops
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database

1. Create a PostgreSQL database (use [Neon](https://neon.tech) for easy setup)
2. Run the migration script:
   ```bash
   # Connect to your database and run:
   psql your-database-url -f database/migrations/001_initial_schema.sql
   ```
3. This creates all tables and a default super admin user

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy the example file
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/airfield_ops?sslmode=require

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this

# Application Configuration
NODE_ENV=development
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Login with Default Super Admin

- Email: `simon@airfieldops.com`
- Password: `changeme123`

**⚠️ IMPORTANT: Change this password immediately in production!**

## Project Structure

```
airfield-ops/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth endpoints
│   │   └── super-admin/          # Admin API routes
│   ├── login/                    # Login page
│   ├── super-admin/              # Super admin dashboard
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main map page
├── components/                   # React components
│   ├── AirfieldMapSimple.tsx    # Main map component
│   ├── WIPCalendar.tsx          # WIP scheduling
│   ├── RunwayInspection.tsx     # Runway condition reporting
│   ├── NoticeTimeline.tsx       # Audit trail viewer
│   ├── providers/               # Context providers
│   └── types/                   # TypeScript types
├── lib/                         # Utility libraries
│   ├── auth.ts                  # Authentication helpers
│   ├── db.ts                    # Database connection
│   └── types/                   # Shared types
├── database/                    # Database files
│   └── migrations/              # SQL migrations
├── docs/                        # Documentation
│   └── database-schema.md       # Database schema docs
├── DEPLOYMENT.md                # Deployment guide
└── README.md                    # This file
```

## Usage Guide

### Super Admin Tasks

1. **Add a New Airport**
   - Go to Super Admin Dashboard
   - Click "Add Airport"
   - Enter ICAO code, name, and details
   - Save

2. **Create Users**
   - Click "Add User"
   - Enter email, name, password
   - Select role (Super Admin / Admin / Viewer)
   - For Admin/Viewer: select their airport
   - Save

3. **Manage System**
   - View all users across all airports
   - Delete inactive users
   - Monitor system-wide activity

### Admin (ATC) Tasks

1. **Manage Airfield Status**
   - Click on taxiways/runways to change status
   - Add closure reasons
   - System automatically creates notices

2. **Schedule Work In Progress (WIP)**
   - Click "Schedule WIP" button
   - Select taxiway/runway and section
   - Set start/end times
   - Add crew and operational impact
   - WIPs auto-activate based on time

3. **Conduct Runway Inspections**
   - Click "Runway Inspection" button
   - Select runway
   - Enter RCC values for each third
   - Add contaminants and remarks
   - Submit (generates notice automatically)

4. **Activate Low Visibility Operations**
   - Toggle "Low Vis Ops" switch
   - Select condition (AWS/NOTAM)
   - Recorded in audit trail

5. **View Audit Trail**
   - Click "Timeline & Audits"
   - Filter by date range and event type
   - Export to PDF for compliance

### Viewer Tasks

- View real-time airfield status (read-only)
- See active WIPs and closures
- Access audit timeline
- Cannot modify any data

## Database Schema

See [docs/database-schema.md](docs/database-schema.md) for complete schema documentation.

### Key Tables

- `airports` - Tenant table
- `users` - User accounts with roles
- `sessions` - Authentication sessions
- `taxiways` - Taxiway definitions
- `runways` - Runway definitions
- `scheduled_wips` - WIP schedules
- `notices` - Operational notices and audit trail
- `runway_inspections` - Runway condition reports

## API Routes

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Super Admin
- `GET /api/super-admin/users` - List all users
- `POST /api/super-admin/users` - Create new user
- `DELETE /api/super-admin/users/[id]` - Delete user
- `GET /api/super-admin/airports` - List all airports
- `POST /api/super-admin/airports` - Create new airport

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to Railway + Neon.

### Quick Deploy

1. Set up Neon PostgreSQL database
2. Run migration script
3. Deploy to Railway
4. Configure environment variables
5. Change default admin password

## Security Considerations

### Production Checklist

- [ ] Change default super admin password
- [ ] Use strong passwords (min 12 characters)
- [ ] Enable HTTPS (automatic with Railway)
- [ ] Set secure `NEXTAUTH_SECRET`
- [ ] Configure proper CORS if needed
- [ ] Enable Row-Level Security (RLS) policies
- [ ] Regular dependency updates (`npm audit`)
- [ ] Monitor access logs via Timeline
- [ ] Restrict super admin access
- [ ] Use custom domain with SSL

### Password Requirements

- Minimum 8 characters (enforced)
- Bcrypt hashing with 10 rounds
- No password reset (admin must create new account)

## Performance Optimization

- Next.js automatic code splitting
- React Server Components for faster loads
- PostgreSQL connection pooling (max 20 connections)
- Indexed database queries
- Efficient SVG rendering

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Cannot Login
- Check DATABASE_URL is correct
- Verify user exists: `SELECT * FROM users WHERE email = 'your-email'`
- Clear browser cookies
- Check NEXTAUTH_SECRET is set

### Database Connection Errors
- Verify PostgreSQL is running
- Check connection string format
- Ensure SSL mode is correct
- Check Neon database is not paused

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Migration Issues
- Ensure all ENUM types are created first
- Check for existing tables: `\dt` in psql
- Verify user permissions

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

Proprietary - All rights reserved

## Support

For issues and questions:
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues
- Review [docs/database-schema.md](docs/database-schema.md) for database questions
- Check Railway logs for runtime errors

## Roadmap

- [ ] Mobile responsive design
- [ ] Push notifications for critical alerts
- [ ] Weather integration
- [ ] NOTAMs integration
- [ ] Flight schedule integration
- [ ] Email notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark/light theme toggle
- [ ] CSV data export

## Credits

Built with Next.js, React, PostgreSQL, and NextAuth.js

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Status**: Production Ready
