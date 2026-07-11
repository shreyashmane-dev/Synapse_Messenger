   cd backend
   npm install
   npm start
   ```

### 3. Frontend Config
1. Rename `/frontend/.env.example` to `/frontend/.env`.
2. Add the config values from your Firebase Console Web App settings:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_BACKEND_URL=http://localhost:5000
   ```
3. Run:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Deployment-Ready Configuration
- **Frontend** is optimized with Vite for Vercel/Netlify. Just connect your GitHub repo, set the build command to `npm run build`, and place the Env variables inside Vercel.
- **Backend** can be deployed to Render, Railway, or Heroku. Make sure you load the `serviceAccountKey.json` from encrypted env vars (like base64) when deploying to a strict cloud host.

Enjoy your completely dark-mode, animated, AI-powered messenger!
- Minor documentation improvements. (2026-07-11 07:39:41.484652)
