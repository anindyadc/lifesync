# **LifeSync Application Deployment Guide**

This guide details the complete process for setting up, securing, and deploying your React application (LifeSync) using Firebase as the backend, Tailwind CSS for styling, and GitHub Pages for hosting.

## **Phase 1: Prerequisites & Installation**

Before writing code, ensure you have the necessary tools installed on your computer.

### **1\. Install Node.js**

Node.js is the runtime required to build React applications.

1. Go to the [Node.js Official Website](https://nodejs.org/).  
2. Download the **LTS (Long Term Support)** version recommended for most users.  
3. Run the installer and follow the on-screen instructions.  
4. Verify installation by opening your terminal (Command Prompt, PowerShell, or Terminal) and typing:  
   node \-v  
   npm \-v

### **2\. Install Git**

Git is used to track your code and push it to GitHub.

1. Go to [git-scm.com](https://www.google.com/search?q=https://git-scm.com/downloads).  
2. Download and run the installer for your operating system.  
3. Verify by running: git \--version in your terminal.

## **Phase 2: Firebase Database Setup**

We need to set up the backend database before the code can run.

1. **Create a Project:**  
   * Go to the [Firebase Console](https://console.firebase.google.com/).  
   * Click **"Add project"** and name it lifesync-app.  
   * Toggle off Google Analytics (optional) and click **Create Project**.  
2. **Enable Authentication:**  
   * Go to **Build** \> **Authentication** in the sidebar.  
   * Click **Get Started**.  
   * Select **Email/Password**.  
   * Enable the **Email/Password** toggle (leave "Email link" off).  
   * Click **Save**.  
3. **Create Firestore Database:**  
   * Go to **Build** \> **Firestore Database**.  
   * Click **Create Database**.  
   * Select a location close to you (e.g., nam5 for US).  
   * **Crucial:** Select **Start in production mode**.  
   * Click **Create**.  
4. **Secure Database Rules:**  
   * Click the **Rules** tab in Firestore.  
   * Replace the existing code with the following rules to ensure users can only access their own data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- HELPER FUNCTIONS ---
    
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Safely check if a profile exists and get its data
    function getProfile() {
      return get(/databases/$(database)/documents/artifacts/default-app-id/public/data/userProfiles/$(request.auth.uid)).data;
    }

    function isAdmin() {
      return isAuthenticated() && getProfile().role == 'admin';
    }

    function hasAppPermission(appName) {
      // Admins get everything, users check their array
      return isAdmin() || (isAuthenticated() && appName in getProfile().allowedApps);
    }

    // --- RULES ---

    // 1. User Profiles Rule
    match /artifacts/default-app-id/public/data/userProfiles/{userId} {
      allow read: if isAuthenticated(); // Allow reading profile directory
      allow create: if isOwner(userId);
      allow update, delete: if isAdmin();
    }

    // 2. TaskFlow Data
    match /artifacts/default-app-id/users/{userId}/tasks/{docId} {
      allow read, write: if isOwner(userId) && hasAppPermission('taskflow');
    }

    // 3. WalletWatch Data
    match /artifacts/default-app-id/users/{userId}/expenses/{docId} {
      allow read, write: if isOwner(userId) && hasAppPermission('walletwatch');
    }

    // 4. ServerLog (changelogs) Data
    match /artifacts/default-app-id/users/{userId}/changelogs/{docId} {
      allow read, write: if isOwner(userId) && hasAppPermission('changemanager');
    }

    // 5. IncidentLogger (incidents) Data
    match /artifacts/default-app-id/users/{userId}/incidents/{docId} {
      allow read, write: if isOwner(userId) && hasAppPermission('incidentlogger');
    }
    
    // Default Deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

   * Click **Publish**.  
5. **Get Your Credentials:**  
   * Click the **Gear Icon** (Project Settings) \> **General**.  
   * Scroll to **Your apps** and click the **\</\> (Web)** icon.  
   * Register app as LifeSyncWeb.  
   * **Copy the firebaseConfig object values.** You will need these keys (apiKey, authDomain, etc.) for the next steps.

## **Phase 3: Local Project Setup & Configuration**

Now we will create the React application on your computer and configure Tailwind CSS.

1. Create the Project:  
   Open your terminal and navigate to where you want to store the code. Run:  
   npm create vite@latest lifesync \-- \--template react  
   cd lifesync

2. Install Dependencies:  
   Install Firebase, icons, Tailwind CSS, and the deployment tool:  
   npm install firebase lucide-react  
   npm install \-D tailwindcss postcss autoprefixer gh-pages

3. Initialize Tailwind CSS:  
   Generate the configuration files:  
   npx tailwindcss init \-p

4. **Configure Tailwind:**  
   * Open tailwind.config.js and replace the content with:  
     /\*\* @type {import('tailwindcss').Config} \*/  
     export default {  
       content: \[  
         "./index.html",  
         "./src/\*\*/\*.{js,ts,jsx,tsx}",  
       \],  
       theme: {  
         extend: {},  
       },  
       plugins: \[\],  
     }

   * Open src/index.css and replace its content with the Tailwind directives:  
     @tailwind base;  
     @tailwind components;  
     @tailwind utilities;

5. **Configure Vite for GitHub Pages:**  
   * Open vite.config.js and add the base property:  
     import { defineConfig } from 'vite'  
     import react from '@vitejs/plugin-react'

     // \[https://vitejs.dev/config/\](https://vitejs.dev/config/)  
     export default defineConfig({  
       plugins: \[react()\],  
       base: '/lifesync/', // This must match your GitHub repository name  
     })

6. **Add the Application Code:**  
   * **index.html**: Locate this file in your **project root** (next to package.json, **NOT** in the public folder). Ensure it contains the following script tag:  
     \<\!doctype html\>  
     \<html lang="en"\>  
       \<head\>  
         \<meta charset="UTF-8" /\>  
         \<link rel="icon" type="image/svg+xml" href="/vite.svg" /\>  
         \<meta name="viewport" content="width=device-width, initial-scale=1.0" /\>  
         \<title\>LifeSync\</title\>  
       \</head\>  
       \<body\>  
         \<div id="root"\>\</div\>  
         \<script type="module" src="/src/main.jsx"\>\</script\>  
       \</body\>  
     \</html\>

   * **src/App.jsx**: Paste the complete LifeSync application code here.  
   * **src/main.jsx**: Ensure it imports the CSS file:  
     import React from 'react'  
     import ReactDOM from 'react-dom/client'  
     import App from './App.jsx'  
     import './index.css'

     ReactDOM.createRoot(document.getElementById('root')).render(  
       \<React.StrictMode\>  
         \<App /\>  
       \</React.StrictMode\>,  
     )

7. **Setup Local Environment Variables:**  
   * Create a file named .env in the root of your project folder.  
   * Add your Firebase credentials here:

   VITE\_FIREBASE\_API\_KEY=your\_api\_key\_from\_firebase  
     VITE\_FIREBASE\_AUTH\_DOMAIN=your\_project\_id.firebaseapp.com  
     VITE\_FIREBASE\_PROJECT\_ID=your\_project\_id  
     VITE\_FIREBASE\_STORAGE\_BUCKET=your\_project\_id.firebasestorage.app  
     VITE\_FIREBASE\_MESSAGING\_SENDER\_ID=your\_sender\_id  
     VITE\_FIREBASE\_APP\_ID=your\_app\_id

   * **Important:** Open .gitignore and ensure .env is listed there.  
8. **Run Locally:**  
   npm run dev

   Troubleshooting: Blank Page  
   If the page loads but is completely white/blank:  
   1. Open index.html in your project root.  
   2. Ensure the \<body\> tag contains this exact script line:  
      \<div id="root"\>\</div\>  
      \<script type="module" src="/src/main.jsx"\>\</script\>

   3. If the script line is missing or different, update it to match above.

## **Phase 4: GitHub Repository & Secrets**

To secure your app online, we will store the database credentials in GitHub's secure vault.

1. **Create a GitHub Repository:**  
   * Go to GitHub.com and create a new public repository named lifesync.  
2. Push Your Code:  
   In your terminal (inside the project folder):  
   git init  
   git add .  
   git commit \-m "Initial commit"  
   git branch \-M main  
   git remote add origin \[https://github.com/YOUR\_USERNAME/lifesync.git\](https://github.com/YOUR\_USERNAME/lifesync.git)  
   git push \-u origin main

3. **Add Secrets to GitHub:**  
   * Go to your repository on GitHub.  
   * Click **Settings** \> **Secrets and variables** \> **Actions**.  
   * Click **New repository secret**.  
   * Add the following secrets (copy values from your .env file):

| Secret Name | Description |
| :---- | :---- |
| VITE\_FIREBASE\_API\_KEY | Your API Key |
| VITE\_FIREBASE\_AUTH\_DOMAIN | Your Auth Domain |
| VITE\_FIREBASE\_PROJECT\_ID | Your Project ID |
| VITE\_FIREBASE\_STORAGE\_BUCKET | Your Storage Bucket |
| VITE\_FIREBASE\_MESSAGING\_SENDER\_ID | Your Sender ID |
| VITE\_FIREBASE\_APP\_ID | Your App ID |

## **Phase 5: GitHub Pages Deployment**

We will use a GitHub Action to build the app, inject the secret keys, and deploy it.

1. Configure package.json:  
   Open package.json and add the homepage property at the top level:  
   {  
     "name": "lifesync",  
     "private": true,  
     "version": "0.0.0",  
     "homepage": "https://YOUR\_USERNAME.github.io/lifesync",  
     "type": "module",  
     ...  
   }

2. **Create the Deployment Workflow:**  
   * Create folder .github \> workflows \> deploy.yml.

**File:** .github/workflows/deploy.ymlname: Deploy to GitHub Pages

on:  
  push:  
    branches: \[ main \]

permissions:  
  contents: write \# This is CRITICAL for pushing to the branch  
  pages: write  
  id-token: write

jobs:  
  build-and-deploy:  
    runs-on: ubuntu-latest  
    steps:  
      \- name: Checkout  
        uses: actions/checkout@v4

      \- name: Install Node.js  
        uses: actions/setup-node@v4  
        with:  
          node-version: 18

      \- name: Install Dependencies  
        run: npm install

      \- name: Build  
        run: npm run build  
        env:  
          VITE\_FIREBASE\_API\_KEY: ${{ secrets.VITE\_FIREBASE\_API\_KEY }}  
          VITE\_FIREBASE\_AUTH\_DOMAIN: ${{ secrets.VITE\_FIREBASE\_AUTH\_DOMAIN }}  
          VITE\_FIREBASE\_PROJECT\_ID: ${{ secrets.VITE\_FIREBASE\_PROJECT\_ID }}  
          VITE\_FIREBASE\_STORAGE\_BUCKET: ${{ secrets.VITE\_FIREBASE\_STORAGE\_BUCKET }}  
          VITE\_FIREBASE\_MESSAGING\_SENDER\_ID: ${{ secrets.VITE\_FIREBASE\_MESSAGING\_SENDER\_ID }}  
          VITE\_FIREBASE\_APP\_ID: ${{ secrets.VITE\_FIREBASE\_APP\_ID }}

      \- name: Deploy to GitHub Pages  
        uses: JamesIves/github-pages-deploy-action@v4  
        with:  
          folder: dist

3. **Push Workflow to Deploy:**  
   git add .  
   git commit \-m "Update deployment permissions"  
   git push

   Troubleshooting: workflow scope error  
   If you see refusing to allow a Personal Access Token to create or update workflow, your token lacks permission.  
   1. Go to GitHub **Settings** \> **Developer Settings** \> **Personal Access Tokens** \> **Tokens (classic)**.  
   2. Select your token (or create a new one).  
   3. Check the **workflow** box (Controls GitHub Actions workflows).  
   4. Save/Generate the token.  
   5. Use this updated token as your password when running git push.

   Troubleshooting: Permission denied (403) / Exit Code 128If the GitHub Action fails with remote: Permission to ... denied to github-actions\[bot\], the bot lacks write permissions.

   1. Go to your repository on GitHub.  
   2. Click **Settings** \> **Actions** \> **General**.  
   3. Scroll to **Workflow permissions**.  
   4. Select **Read and write permissions**.  
   5. Click **Save**.  
   6. Go to the **Actions** tab, click the failed run, and click **Re-run all jobs**.  
4. **Finalize on GitHub:**  
   * Go to **Settings** \> **Pages**.  
   * Under "Build and deployment", ensure the source is "Deploy from a branch" and the branch is set to gh-pages / root.  
   * Your live link will appear at the top of the Pages settings.
