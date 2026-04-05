# Private AI Community Messenger (Aetheris)

A premium SaaS-level messaging platform designed with a futuristic "Obsidian Void" aesthetic.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Three.js (@react-three/fiber).
- **Backend**: Node.js, Express, Socket.io, Firebase Admin.
- **Database / Auth**: Firebase Firestore + Firebase Authentication.

## Folder Structure
```text
.
├── backend/            # Express, WebSockets, Firebase Admin, and AI logic
│   ├── server.js       # Main server entrypoint
│   ├── firebase.js     # Firebase connection setup
│   ├── .env.example    # Backend environment template
│   └── package.json
└── frontend/           # React + Vite application
    ├── src/
    │   ├── components/ # Reusable UI pieces (Canvas, 3D Hero, Chat Elements)
    │   ├── pages/      # Views (LandingPage, Dashboard)
    │   ├── index.css   # Main Tailwind stylesheet mapping the design system
    │   ├── App.jsx     # Routing
    │   └── main.jsx
    ├── tailwind.config.js # Theming and Design Tokens
    └── .env.example    # Frontend environment template
```

## Setup Instructions

### 1. Firebase Preparation
You need a Firebase project with Authentication (Anonymous + Google) and Firestore Database enabled.

1. Go to the [Firebase Console](https://console.firebase.google.com).
2. Create a new App and grab your Web Configuration config.
3. Once in the project, go to **Build -> Authentication** and enable **Anonymous** and **Google** sign-in providers.
4. Go to **Build -> Firestore Database** and create a Database. Start in test mode for development.
5. Create collections expected: `users`, `communities`, `channels`, `threads`, `messages`, `ai_history`.

### 2. Backend Config
1. Go to Firebase **Project Settings -> Service Accounts** and click **Generate new private key**.
2. Download the JSON file, rename it to `serviceAccountKey.json`, and place it in the `backend/` directory.
3. Rename `/backend/.env.example` to `/backend/.env` and update variables:
   ```env
   PORT=5000
   OPENAI_API_KEY=your_actual_openai_key
   ```
4. Run:
   ```bash
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
