# Qlyvora — Deployment Guide

This guide explains how to deploy **Qlyvora** to a public cloud provider so anyone can play from their mobile phone or laptop.

---

## 1. Quickest Free Cloud Deployment: Render (Recommended)

Render offers free web service hosting that natively supports WebSockets and automatically builds both the frontend and backend.

### Automatic Blueprint Deployment (1-Click via `render.yaml`)
1. Create a free account at [render.com](https://render.com).
2. Push your project code to a new repository on your **GitHub** account:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/qlyvora.git
   git branch -M main
   git push -u origin main
   ```
3. In the Render Dashboard, click **New +** $\rightarrow$ **Blueprints**.
4. Connect your `qlyvora` GitHub repository. Render will automatically detect the bundled `render.yaml` configuration:
   - **Service Name:** `qlyvora`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/healthz`
   - **Environment Variables:** `NODE_ENV=production`, `PORT=10000`
5. Click **Apply**.
6. Once deployed, Render will issue a permanent public URL (e.g. `https://qlyvora.onrender.com`).

---

## 2. Alternative: Railway or Fly.io

### Railway
1. Go to [railway.app](https://railway.app) and click **New Project** $\rightarrow$ **Deploy from GitHub repo**.
2. Select your `qlyvora` repository.
3. In Settings $\rightarrow$ Networking, click **Generate Domain**.
4. The build and start scripts in `package.json` (`npm run build` and `npm start`) run automatically.

---

## 3. Instant Public URL from Local Machine (Tunneling)

If you want to immediately invite friends on their phones right now without uploading to GitHub:

1. Run the localtunnel command in your terminal:
   ```powershell
   npx localtunnel --port 3001
   ```
2. It will output a public HTTPS URL (e.g., `https://smooth-pears-cover.loca.lt`).
3. Share that link with your friends on their mobile phones!
