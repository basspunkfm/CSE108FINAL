# Battleship Game - Render Deployment Guide

## ✅ What's Been Prepared

Your app is now ready for deployment! Here's what was configured:

### 1. Database Migration (SQLite → PostgreSQL)
- ✅ Updated `app.py` to use PostgreSQL in production
- ✅ Installed `psycopg2-binary` for PostgreSQL support
- ✅ App still uses SQLite locally for development

### 2. Environment Variables
- ✅ `SECRET_KEY` - Flask secret key
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `FLASK_API_URL` - Flask API URL for Socket.IO server
- ✅ `PORT` - Server port (auto-assigned by Render)

### 3. Deployment Files
- ✅ `requirements.txt` - Python dependencies
- ✅ `render.yaml` - Render configuration
- ✅ Updated `server.js` with environment variables
- ✅ Updated `battleship.js` with dynamic socket URL

---

## 🚀 Deployment Steps

### Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Initialize git in your project (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Battleship game ready for deployment"
   ```
3. Connect to GitHub:
   ```bash
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

### Step 2: Deploy to Render

1. **Sign up at [Render.com](https://render.com)**
   - Use GitHub to sign in

2. **Create New Blueprint**
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `render.yaml` automatically

3. **Review Services**
   - Flask Backend: `battleship-flask`
   - Socket.IO Server: `battleship-socketio`
   - PostgreSQL Database: `battleship-db`
   - Click "Apply"

4. **Wait for Deployment** (5-10 minutes)
   - Render will build and deploy all services
   - Database will be created automatically

### Step 3: Update Socket URL

After deployment, you'll get URLs like:
- Flask: `https://battleship-flask.onrender.com`
- Socket.IO: `https://battleship-socketio.onrender.com`

1. Open `src/battleship.js`
2. Replace `YOUR_RENDER_SOCKETIO_URL_HERE` (line 414) with your actual Socket.IO URL:
   ```javascript
   const socketURL = isProduction
       ? 'https://battleship-socketio.onrender.com'
       : 'http://localhost:3000';
   ```

3. Commit and push:
   ```bash
   git add src/battleship.js
   git commit -m "Update production socket URL"
   git push
   ```

Render will automatically redeploy!

### Step 4: Build and Deploy Frontend

You have two options:

#### Option A: Serve from Flask (Recommended)
1. Build Vite production files:
   ```bash
   npm run build
   ```
2. Move `dist` folder contents to Flask's `static` folder
3. Create a route in `app.py` to serve `index.html`

#### Option B: Deploy to Vercel/Netlify
1. Deploy the Vite app separately to Vercel or Netlify
2. Update menu.html to point to the deployed frontend URL

---

## 🎮 Access Your Game

Once deployed:
- **Admin Panel**: `https://battleship-flask.onrender.com/admin`
  - Username: `admin`
  - Password: `admin`

- **Game**: `https://battleship-flask.onrender.com`

---

## 🔧 Troubleshooting

### Database Issues
- Render provides PostgreSQL automatically
- Check "Dashboard" → "battleship-db" for connection string

### Environment Variables
- Go to each service → "Environment" to verify:
  - `DATABASE_URL` is set
  - `FLASK_API_URL` points to Flask service
  - `SECRET_KEY` is generated

### Build Failures
- Check logs in Render dashboard
- Verify `requirements.txt` and `package.json` are correct

---

## 📝 Notes

- **Free Tier**: Services sleep after 15 minutes of inactivity
- **First Load**: May take 30-60 seconds to wake up
- **Database**: PostgreSQL is persistent, won't lose data
- **Admin User**: Created automatically on first run

---

## 🎉 You're Done!

Your Battleship game is now live and accessible worldwide! 🌍

Need help? Check Render's logs for detailed error messages.
