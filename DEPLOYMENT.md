# CivicFix Deployment Guide

This document outlines the deployment configuration and required environment variables for deploying the **CivicFix** full-stack application (Server on Render, Client on Vercel).

---

## 1. Server Deployment (Render)

Deploy the `server/` directory as a **Web Service** on [Render](https://render.com/).

### Build & Start Commands
- **Runtime**: `Node`
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `node server.js` (or `npm start`)
- **Health Check Path**: `/api/health`

### Required Environment Variables (Render Dashboard)
Configure the following variable names in the Render dashboard under **Environment**:

- `PORT` *(Render supplies this automatically, but server defaults to 5000 if omitted)*
- `NODE_ENV` *(Set to `production`)*
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL` *(Supports comma-separated origins, e.g. `http://localhost:5173,https://your-app.vercel.app`)*
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

---

## 2. Client Deployment (Vercel)

Deploy the `client/` directory as a project on [Vercel](https://vercel.com/).

### Build & Output Settings
- **Framework Preset**: `Vite`
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **SPA Routing**: Configured via [client/vercel.json](file:///c:/Users/kanha/.gemini/antigravity/scratch/civicfix/client/vercel.json) rewrite rule to prevent 404 errors on browser page reloads.

### Required Environment Variables (Vercel Dashboard)
Configure the following variable name in the Vercel dashboard under **Settings > Environment Variables**:

- `VITE_API_URL` *(Points to the Render backend API, e.g. `https://your-service.onrender.com/api`)*

---

## 3. Post-Deployment Verification Checklist
1. Visit `https://your-service.onrender.com/api/health` $\rightarrow$ should return `{"status": "ok"}`.
2. Visit the Vercel frontend URL $\rightarrow$ should load the landing page without console errors.
3. Refresh any sub-route (`/map`, `/login`, `/dashboard`) $\rightarrow$ should render properly via the Vercel rewrite without a 404 error.
4. Report an issue or log in to verify full end-to-end communication between Vercel and Render.
