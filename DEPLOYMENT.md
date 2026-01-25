# Deployment Guide - Railway + Neon PostgreSQL

This guide will walk you through deploying your multi-tenant Airfield Operations system to Railway with Neon PostgreSQL.

## Prerequisites

1. [Railway Account](https://railway.app) (sign up at railway.app)
2. [Neon Account](https://neon.tech) (sign up at neon.tech)
3. Git repository for your code (GitHub, GitLab, or Bitbucket)

## Step 1: Set Up Neon PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) and sign in
2. Create a new project:
   - Click "New Project"
   - Name it: "airfield-ops" (or your preferred name)
   - Select your preferred region
   - Click "Create Project"

3. Get your connection string:
   - In your Neon dashboard, click on your project
   - Go to "Connection Details"
   - Copy the connection string (it looks like: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`)
   - Save this for later

4. Run the database migration:
   - Use the Neon SQL Editor or your local PostgreSQL client
   - Navigate to `database/migrations/001_initial_schema.sql`
   - Copy the entire SQL file and run it in the Neon SQL Editor
   - This will create all tables, indexes, and the initial super admin user

## Step 2: Generate NextAuth Secret

Run this command in your terminal to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Save this secret for the next step.

## Step 3: Deploy to Railway

### Option A: Deploy via Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app) and sign in

2. Create a new project:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account if needed
   - Select your airfield-ops repository
   - Click "Deploy Now"

3. Configure environment variables:
   - Click on your deployed service
   - Go to "Variables" tab
   - Add the following variables:

   ```
   DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   NEXTAUTH_URL=https://your-app.railway.app
   NEXTAUTH_SECRET=your-generated-secret-from-step-2
   NODE_ENV=production
   ```

   **Important:**
   - Replace `DATABASE_URL` with your Neon connection string from Step 1
   - Replace `NEXTAUTH_URL` with your Railway app URL (you'll see this after deployment)
   - Replace `NEXTAUTH_SECRET` with the secret you generated in Step 2

4. Deploy:
   - Railway will automatically detect your Next.js app
   - Click "Deploy" if it doesn't start automatically
   - Wait for the build to complete (usually 3-5 minutes)

5. Get your app URL:
   - Once deployed, click "Settings"
   - Under "Domains", you'll see your Railway URL (e.g., `https://airfield-ops-production.up.railway.app`)
   - Copy this URL

6. Update NEXTAUTH_URL:
   - Go back to "Variables"
   - Update `NEXTAUTH_URL` with your actual Railway URL
   - Save and redeploy

### Option B: Deploy via Railway CLI

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Initialize your project:
   ```bash
   cd c:\Users\Simon\airfield-ops
   railway init
   ```

4. Link to your project or create new:
   ```bash
   railway link
   ```

5. Set environment variables:
   ```bash
   railway variables set DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
   railway variables set NEXTAUTH_SECRET="your-generated-secret"
   railway variables set NODE_ENV="production"
   ```

6. Deploy:
   ```bash
   railway up
   ```

7. Get your deployment URL:
   ```bash
   railway domain
   ```

8. Update NEXTAUTH_URL:
   ```bash
   railway variables set NEXTAUTH_URL="https://your-app.railway.app"
   ```

## Step 4: Verify Deployment

1. Visit your Railway app URL
2. You should see the login page
3. Try logging in with the default super admin account:
   - Email: `simon@airfieldops.com`
   - Password: `changeme123`

**CRITICAL SECURITY STEP:**
4. Immediately change the super admin password:
   - Go to Super Admin Dashboard
   - Create a new super admin user with your actual email
   - Delete or disable the default `simon@airfieldops.com` account

## Step 5: Configure Your First Airport

1. Log in as super admin
2. Click "Admin Panel" in the top right
3. Add your first airport:
   - Click "Add Airport"
   - Enter airport details (Name, ICAO code, etc.)
   - Click "Create Airport"

4. Add admin users for your airport:
   - Click "Add User"
   - Enter user details
   - Select role: "Admin" for ATC staff
   - Select the airport you just created
   - Set a secure password
   - Click "Create User"

5. Add viewer users (optional):
   - Same process as above, but select role: "Viewer"

## Step 6: Custom Domain (Optional)

1. In Railway dashboard, go to your service
2. Click "Settings" → "Domains"
3. Click "Custom Domain"
4. Enter your domain (e.g., `airfield.yourdomain.com`)
5. Add the CNAME record to your DNS provider as instructed
6. Wait for DNS propagation (5-30 minutes)
7. Update `NEXTAUTH_URL` environment variable to your custom domain

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_URL` | Your app's public URL | `https://airfield-ops.railway.app` |
| `NEXTAUTH_SECRET` | Secret key for session encryption | `generated-32-byte-base64-string` |
| `NODE_ENV` | Environment mode | `production` |

## Monitoring and Logs

### Railway Logs
- Go to your Railway project
- Click "Deployments"
- Select latest deployment
- View real-time logs

### Database Monitoring
- Go to Neon dashboard
- Click "Monitoring"
- View query performance, connections, and storage

## Troubleshooting

### Database Connection Errors
1. Check that `DATABASE_URL` is correct
2. Verify Neon database is active (not paused)
3. Check Neon connection limits (Neon free tier: 100 connections)

### Authentication Issues
1. Verify `NEXTAUTH_SECRET` is set
2. Check `NEXTAUTH_URL` matches your actual URL
3. Clear browser cookies and try again

### Build Failures
1. Check Railway build logs for errors
2. Verify all dependencies are in `package.json`
3. Ensure `next.config.js` is properly configured

### Migration Issues
1. Verify the SQL migration ran successfully in Neon
2. Check table existence: `SELECT * FROM users LIMIT 1;`
3. Ensure RLS policies are enabled if needed

## Scaling Considerations

### Database Scaling (Neon)
- Free tier: 0.5 GB storage, 100 max connections
- Pro tier: Scale up to 200 GB, unlimited connections
- Enable connection pooling for better performance

### Application Scaling (Railway)
- Railway auto-scales based on traffic
- Monitor resource usage in Railway dashboard
- Consider upgrading plan for higher limits

## Backup Strategy

### Database Backups (Neon)
- Neon automatically backs up your database
- Point-in-time recovery available on Pro plan
- Manual exports: Use Neon SQL Editor or pg_dump

### Application Backups
- Code is in your Git repository
- Environment variables should be documented
- Regular backups of uploaded images/files

## Security Best Practices

1. **Change default passwords immediately**
2. **Use strong, unique passwords for all users**
3. **Enable 2FA on Railway and Neon accounts**
4. **Regularly update dependencies**: `npm audit fix`
5. **Monitor access logs** via Timeline & Audits feature
6. **Restrict super admin access** to authorized personnel only
7. **Use custom domain with HTTPS** (Railway provides this automatically)
8. **Regular security audits** of user accounts

## Support and Issues

- Railway Support: [railway.app/help](https://railway.app/help)
- Neon Support: [neon.tech/docs](https://neon.tech/docs)
- Application Issues: Check deployment logs and Neon query logs

## Cost Estimation

### Free Tier (Good for testing)
- Railway: $5 credit/month (enough for small apps)
- Neon: Free tier with 0.5 GB storage

### Production Tier (Recommended)
- Railway: ~$10-20/month (scales with usage)
- Neon: ~$19/month (Pro plan)
- Total: ~$30-40/month for a production deployment

---

**Next Steps After Deployment:**
1. Change default super admin password
2. Add your first airport
3. Create admin and viewer users
4. Upload your airport diagram
5. Configure taxiways and runways
6. Start managing operations!
