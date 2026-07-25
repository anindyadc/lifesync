# **LifeSync Application Deployment Guide**

This guide details the complete process for setting up, securing, and deploying your React application (LifeSync) using Firebase as the backend, Tailwind CSS for styling, and GitHub Pages for hosting.

## **Project Overview**

LifeSync is a multi-module React application designed to help you organize different aspects of your life. It uses Firebase for a secure backend and includes several apps:

*   **TaskFlow:** A task manager with two task types: **planned tasks** (subtasks, per-task/subtask time logs, priority, due dates, and progress that's manual or auto-computed from subtask completion) and a lightweight **Quick List** for same-day/tomorrow checklists. Tasks can be tagged **Personal** or **Official**, with a user-editable list of offices, so you can view everything together or scoped to one office — with matching dashboard, filter, and report breakdowns. Categories and Offices are both user-editable with their own colors/icons. "My Tasks" supports search, priority/category/type/office filters, sorting, bulk mark-done/delete, and a Card or List view toggle. The dashboard shows a KPI summary (with a month-over-month completion-rate trend) alongside Priority and Category breakdown charts and a detailed report table; the report tab adds date-range filtering and Time-by-Office / Time-by-Category breakdowns, all reflected in CSV/PDF export. An optional daily Telegram reminder for tasks due today or overdue can be enabled via GitHub Actions — see Phase 4, step 4.
*   **WalletWatch:** An expense tracker with a collapsible transaction history and a monthly dashboard view. Group transactions by month, event, or individually, with search, a date range, multi-select filters (category, tags, trips, payment accounts/modes), sorting, a Card or List view toggle, and CSV/PDF export scoped to whatever's currently filtered. Each history group shows a Spent/Lent/Official breakdown rather than a single mixed total. A separate **Misc Expenses** entry lets you jot down small same-day spends (tea, auto, snacks) across multiple visits during the day and combine them into one transaction whenever you're ready. The dashboard shows a KPI summary (spend, pending reimbursement, average daily spend, transaction count) alongside spending-trend, category, payment-mode/account, and top trips/events charts. The interface also includes smart autocomplete for tags, event groups, and payment accounts.
*   **IncidentLogger:** A tool for logging incidents, with priority/status tracking, a dedicated resolve flow, edit/delete, search/filter, and CSV/PDF export.
*   **ChangeManager:** An infrastructure change log with list, per-server timeline, and archive views; search/filter by server or application, CSV/PDF export, and archive/unarchive (hard delete is also available).
*   **Investment:** Tracks holdings with a list and maturity calendar view; amounts are AES-encrypted client-side before being stored in Firestore (see the `VITE_INVESTMENT_SECRET_KEY` note in Phase 3, step 7).
*   **MediWatch:** A medical record tracker for storing multi-page prescription photos, listing medicines with alternate name options, and managing family health data. It features automatic archiving of old prescriptions for the same condition, highly optimized Base64 image storage directly in Firestore (no Firebase Storage required), a built-in full-screen swipeable image viewer, and native sharing capabilities.
*   **Admin:** An admin-only screen for managing user access — toggle each user's role (`admin`/`user`) and which apps they're allowed to use, with search by name/email.

## **Phase 1: Prerequisites & Installation**

Before writing code, ensure you have the necessary tools installed on your computer.

### **1. Install Node.js**

Node.js is the runtime required to build React applications.

1. Go to the [Node.js Official Website](https://nodejs.org/).
2. Download the **LTS (Long Term Support)** version recommended for most users.
3. Run the installer and follow the on-screen instructions.
4. Verify installation by opening your terminal (Command Prompt, PowerShell, or Terminal) and running:
   ```bash
   node -v
   npm -v
   ```

### **2. Install Git**

Git is used to track your code and push it to GitHub.

1. Go to [git-scm.com](https://git-scm.com/downloads).
2. Download and run the installer for your operating system.
3. Verify by running:
   ```bash
   git --version
   ```

## **Phase 2: Firebase Database Setup**

We need to set up the backend database before the code can run.

1. **Create a Project:**
   * Go to the [Firebase Console](https://console.firebase.google.com/).
   * Click **"Add project"** and name it `lifesync-app`.
   * Toggle off Google Analytics (optional) and click **Create Project**.
2. **Enable Authentication:**
   * Go to **Build** > **Authentication** in the sidebar.
   * Click **Get Started**.
   * Select **Email/Password**.
   * Enable the **Email/Password** toggle (leave "Email link" off).
   * Click **Save**.
3. **Create Firestore Database:**
   * Go to **Build** > **Firestore Database**.
   * Click **Create Database**.
   * Select a location close to you (e.g., `nam5` for US).
   * **Crucial:** Select **Start in production mode**.
   * Click **Create**.
4. **Secure Database Rules:**
   * Click the **Rules** tab in Firestore.
   * Replace the existing code with the following rules to ensure users can only access their own data. This mirrors the repo's `firestore.rules` file — if the two ever diverge, trust the actual file in the repo, not this copy:

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
      return isAuthenticated() && 'role' in getProfile() && getProfile().role == 'admin';
    }

    // Securely checks for app permissions — verifies 'allowedApps' exists
    // before checking for the appName, so a profile without it doesn't error.
    function hasAppPermission(appName) {
      let profile = getProfile();
      return isAdmin() || (
        isAuthenticated() &&
        'allowedApps' in profile &&
        appName in profile.allowedApps
      );
    }

    // --- RULES ---

    // 1. User Profiles Rule
    match /artifacts/default-app-id/public/data/userProfiles/{userId} {
      allow read: if isAuthenticated(); // Allow reading the profile directory
      allow create: if isOwner(userId);
      allow update, delete: if isAdmin();
    }

    // 2. Generic, Secure Rule for All App Data
    // Covers every mini app's main collection automatically, as long as its
    // Firestore path segment matches its `allowedApps` entry name.
    match /artifacts/default-app-id/users/{userId}/{appName}/{docId} {
      allow read, write: if isOwner(userId) && hasAppPermission(appName);
    }

    // 3. WalletWatch settings (custom categories) — unique nested path
    match /artifacts/default-app-id/users/{userId}/settings/walletConfig {
      allow read, write: if isOwner(userId) && hasAppPermission('walletwatch');
    }

    // 4. TaskFlow settings (custom categories & offices) — unique nested path
    match /artifacts/default-app-id/users/{userId}/settings/taskConfig {
      allow read, write: if isOwner(userId) && hasAppPermission('taskflow');
    }

    // 5. TaskFlow's Quick List — its own top-level collection ("quickTasks")
    // would otherwise make rule #2 check for 'quickTasks' in allowedApps
    // instead of 'taskflow', so it needs its own explicit block.
    match /artifacts/default-app-id/users/{userId}/quickTasks/{docId} {
      allow read, write: if isOwner(userId) && hasAppPermission('taskflow');
    }

    // 6. WalletWatch's Misc Expense draft — same unique-path reason as walletConfig
    match /artifacts/default-app-id/users/{userId}/settings/miscExpenseDraft {
      allow read, write: if isOwner(userId) && hasAppPermission('walletwatch');
    }
  }
}
```

   * Click **Publish**.
5. **Get Your Credentials:**
   * Click the **Gear Icon** (Project Settings) > **General**.
   * Scroll to **Your apps** and click the **`</>` (Web)** icon.
   * Register app as `LifeSyncWeb`.
   * **Copy the `firebaseConfig` object values.** You will need these keys (`apiKey`, `authDomain`, etc.) for the next steps.

## **Phase 3: Local Project Setup & Configuration**

Now we will create the React application on your computer and configure Tailwind CSS.

1. **Create the Project:**
   Open your terminal and navigate to where you want to store the code. Run:
   ```bash
   npm create vite@latest lifesync -- --template react
   cd lifesync
   ```

2. **Install Dependencies:**
   Install Firebase, icons, Tailwind CSS, and the deployment tool:
   ```bash
   npm install firebase lucide-react
   npm install -D tailwindcss postcss autoprefixer gh-pages
   ```

3. **Initialize Tailwind CSS:**
   Generate the configuration files:
   ```bash
   npx tailwindcss init -p
   ```

4. **Configure Tailwind:**
   * Open `tailwind.config.js` and replace the content with:
     ```js
     /** @type {import('tailwindcss').Config} */
     export default {
       content: [
         "./index.html",
         "./src/**/*.{js,ts,jsx,tsx}",
       ],
       theme: {
         extend: {},
       },
       plugins: [],
     }
     ```
   * Open `src/index.css` and replace its content with the Tailwind directives:
     ```css
     @tailwind base;
     @tailwind components;
     @tailwind utilities;
     ```

5. **Configure Vite for GitHub Pages:**
   * Open `vite.config.js` and add the `base` property:
     ```js
     import { defineConfig } from 'vite'
     import react from '@vitejs/plugin-react'

     // https://vitejs.dev/config/
     export default defineConfig({
       plugins: [react()],
       base: '/lifesync/', // This must match your GitHub repository name
     })
     ```

6. **Add the Application Code:**
   * **index.html**: Locate this file in your **project root** (next to `package.json`, **NOT** in the `public` folder). Ensure it contains the following script tag:
     ```html
     <!doctype html>
     <html lang="en">
       <head>
         <meta charset="UTF-8" />
         <link rel="icon" type="image/svg+xml" href="/vite.svg" />
         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
         <title>LifeSync</title>
       </head>
       <body>
         <div id="root"></div>
         <script type="module" src="/src/main.jsx"></script>
       </body>
     </html>
     ```
   * **src/App.jsx**: Paste the complete LifeSync application code here.
   * **src/main.jsx**: Ensure it imports the CSS file:
     ```jsx
     import React from 'react'
     import ReactDOM from 'react-dom/client'
     import App from './App.jsx'
     import './index.css'

     ReactDOM.createRoot(document.getElementById('root')).render(
       <React.StrictMode>
         <App />
       </React.StrictMode>,
     )
     ```

7. **Setup Local Environment Variables:**
   * Create a file named `.env` in the root of your project folder.
   * Add your Firebase credentials here:
     ```bash
     VITE_FIREBASE_API_KEY=your_api_key_from_firebase
     VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     VITE_INVESTMENT_SECRET_KEY=a_long_random_string_you_generate
     ```
   * `VITE_INVESTMENT_SECRET_KEY` is used by the Investment app to AES-encrypt investment amounts client-side before they're written to Firestore. Generate a long random value yourself (e.g. `openssl rand -hex 32`) — if this variable is missing, the app falls back to an insecure default and logs a warning to the console.
   * **Important:** Open `.gitignore` and ensure `.env` is listed there.

8. **Run Locally:**
   ```bash
   npm run dev
   ```

   **Troubleshooting: Blank Page**
   If the page loads but is completely white/blank:
   1. Open `index.html` in your project root.
   2. Ensure the `<body>` tag contains this exact script line:
      ```html
      <div id="root"></div>
      <script type="module" src="/src/main.jsx"></script>
      ```
   3. If the script line is missing or different, update it to match above.

## **Phase 4: GitHub Repository & Secrets**

To secure your app online, we will store the database credentials in GitHub's secure vault.

1. **Create a GitHub Repository:**
   * Go to GitHub.com and create a new public repository named `lifesync`.
2. **Push Your Code:**
   In your terminal (inside the project folder):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/lifesync.git
   git push -u origin main
   ```

3. **Add Secrets to GitHub:**
   * Go to your repository on GitHub.
   * Click **Settings** > **Secrets and variables** > **Actions**.
   * Click **New repository secret**.
   * Add the following secrets (copy values from your `.env` file):

| Secret Name | Description |
| :---- | :---- |
| VITE_FIREBASE_API_KEY | Your API Key |
| VITE_FIREBASE_AUTH_DOMAIN | Your Auth Domain |
| VITE_FIREBASE_PROJECT_ID | Your Project ID |
| VITE_FIREBASE_STORAGE_BUCKET | Your Storage Bucket |
| VITE_FIREBASE_MESSAGING_SENDER_ID | Your Sender ID |
| VITE_FIREBASE_APP_ID | Your App ID |
| VITE_INVESTMENT_SECRET_KEY | Random secret used to encrypt Investment amounts |

4. **(Optional) TaskFlow Telegram Reminders:**
   A daily digest of pending planned tasks (due today or overdue) can be sent to Telegram via a scheduled GitHub Actions workflow (`.github/workflows/task-reminders.yml`) — no paid Firebase plan or extra hosting needed, since it never touches Cloud Functions and Firestore access itself stays on the free Spark plan.
   * **Get a Telegram bot token and chat ID** (skip if you already have both): message [@BotFather](https://t.me/BotFather) on Telegram, run `/newbot` and follow the prompts to get a bot token; then message your new bot once and visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in a browser to find your numeric `chat.id`.
   * **Get a Firebase service account key:** Firebase Console > Project Settings (gear icon) > **Service Accounts** tab > **Generate new private key** — downloads a JSON file. This grants full Firestore access, so treat it like a password.
   * **Get your Firebase Auth UID:** Firebase Console > **Build** > **Authentication** > **Users** > copy the UID next to your account (this is who the reminder checks tasks for).
   * **Add these as GitHub repository secrets** (same Settings > Secrets and variables > Actions screen as above):

| Secret Name | Description |
| :---- | :---- |
| FIREBASE_SERVICE_ACCOUNT | The entire downloaded service-account JSON file, pasted as-is |
| TARGET_UID | Your Firebase Auth UID |
| TELEGRAM_BOT_TOKEN | Your bot token from @BotFather |
| TELEGRAM_CHAT_ID | Your numeric Telegram chat ID |

   * Once all four secrets are set, go to the **Actions** tab > **TaskFlow Telegram Reminders** > **Run workflow** to send a test digest immediately, without waiting for the daily 08:00 IST schedule.

## **Phase 5: GitHub Pages Deployment**

We will use a GitHub Action to build the app, inject the secret keys, and deploy it.

1. **Configure package.json:**
   Open `package.json` and add the `homepage` property at the top level:
   ```json
   {
     "name": "lifesync",
     "private": true,
     "version": "0.0.0",
     "homepage": "https://YOUR_USERNAME.github.io/lifesync",
     "type": "module",
     ...
   }
   ```

2. **Create the Deployment Workflow:**
   * Create folder `.github/workflows/deploy.yml`.

   **File:** `.github/workflows/deploy.yml`
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   permissions:
     contents: write # This is CRITICAL for pushing to the branch
     pages: write
     id-token: write

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4

         - name: Install Node.js
           uses: actions/setup-node@v4
           with:
             node-version: 18

         - name: Install Dependencies
           run: npm install

         - name: Build
           run: npm run build
           env:
             VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
             VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
             VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
             VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
             VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
             VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
             VITE_INVESTMENT_SECRET_KEY: ${{ secrets.VITE_INVESTMENT_SECRET_KEY }}

         - name: Deploy to GitHub Pages
           uses: JamesIves/github-pages-deploy-action@v4
           with:
             folder: dist
   ```
   Don't forget `VITE_INVESTMENT_SECRET_KEY` in the `env:` block — without it, the deployed build silently falls back to Investment's insecure placeholder key instead of the one you set up in Phase 3/4.

3. **Push Workflow to Deploy:**
   ```bash
   git add .
   git commit -m "Update deployment permissions"
   git push
   ```

   **Troubleshooting: workflow scope error**
   If you see `refusing to allow a Personal Access Token to create or update workflow`, your token lacks permission.
   1. Go to GitHub **Settings** > **Developer Settings** > **Personal Access Tokens** > **Tokens (classic)**.
   2. Select your token (or create a new one).
   3. Check the **workflow** box (Controls GitHub Actions workflows).
   4. Save/Generate the token.
   5. Use this updated token as your password when running `git push`.

   **Troubleshooting: Permission denied (403) / Exit Code 128**
   If the GitHub Action fails with `remote: Permission to ... denied to github-actions[bot]`, the bot lacks write permissions.
   1. Go to your repository on GitHub.
   2. Click **Settings** > **Actions** > **General**.
   3. Scroll to **Workflow permissions**.
   4. Select **Read and write permissions**.
   5. Click **Save**.
   6. Go to the **Actions** tab, click the failed run, and click **Re-run all jobs**.

4. **Finalize on GitHub:**
   * Go to **Settings** > **Pages**.
   * Under "Build and deployment", ensure the source is "Deploy from a branch" and the branch is set to `gh-pages` / `root`.
   * Your live link will appear at the top of the Pages settings.

## **Phase 6: Best Practices for Git Repository Maintenance**

To maintain this repository at a production standard, avoid committing directly to the `main` branch. Instead, follow a standard Git feature-branch workflow:

### **1. Sync your local repository**
Always start by ensuring your local `main` branch is up to date:
```bash
git checkout main
git pull origin main
```

### **2. Create a Feature Branch**
Create a new branch for every new feature, bug fix, or update:
```bash
git checkout -b feature/your-feature-name
# Use 'bugfix/...' for bug fixes, or 'chore/...' for maintenance tasks
```

### **3. Commit Changes**
Make your changes, stage them, and write clear, descriptive commit messages following conventional commits:
```bash
git status
git add .
git commit -m "feat: add new medical tracking module"
# Or: git commit -m "fix: resolve image upload bug"
```

### **4. Push to GitHub**
Push your feature branch to the remote repository:
```bash
git push -u origin feature/your-feature-name
```

### **5. Create a Pull Request (PR)**
* Go to your repository on GitHub.
* Click **Compare & pull request**.
* Review your changes and merge them into `main` using the GitHub UI.

### **6. Clean Up**
Once merged, switch back to `main`, pull the latest changes, and delete your local feature branch to keep your environment clean:
```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

## **Phase 7: Release Management**

To properly manage releases and track versions of your application in a production environment, adopt the following strategy:

### **1. Semantic Versioning (SemVer)**
Use standard versioning (Major.Minor.Patch):
* **Major (e.g., 2.0.0):** Incompatible API changes or massive overhauls.
* **Minor (e.g., 1.1.0):** Backward-compatible new features (like adding MediWatch).
* **Patch (e.g., 1.0.1):** Backward-compatible bug fixes.

Update the version using `npm`:
```bash
# This updates package.json and creates a git tag automatically
npm version minor -m "chore(release): %s"
```

### **2. Generate a Changelog (Optional but Recommended)**
Since you are using conventional commits (`feat:`, `fix:`), you can automatically generate release notes.
You can use a tool like `standard-version`:
```bash
npx standard-version
```

### **3. Tagging and GitHub Releases**
Once a version is ready to go to production (merged into `main`):
1. Push your tags to GitHub:
   ```bash
   git push --follow-tags origin main
   ```
2. Go to your GitHub repository -> **Releases** -> **Draft a new release**.
3. Select the tag you just pushed.
4. Click **Generate release notes** (GitHub will automatically list the PRs and commits since the last release).
5. Click **Publish release**.

### **4. Environment Strategy**
Currently, your app deploys directly to production (`gh-pages`) upon merging to `main`. As your team or project grows, consider:
* **Staging Environment:** Use Firebase Hosting Preview Channels or a separate branch (like `develop`) that deploys to a different URL for testing before merging into `main`.
