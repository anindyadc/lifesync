// Sends a Telegram digest of TaskFlow's pending planned tasks (due today or overdue)
// for a single configured user. Reminder-only — there is deliberately no "mark done"
// link/webhook here, so this needs no public HTTP endpoint and no Firebase Blaze plan;
// it just reads Firestore directly via a service account and calls the Telegram Bot API.
const admin = require('firebase-admin');

const APP_ID = 'default-app-id';
const { FIREBASE_SERVICE_ACCOUNT, TARGET_UID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

if (!FIREBASE_SERVICE_ACCOUNT || !TARGET_UID || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Missing one of FIREBASE_SERVICE_ACCOUNT / TARGET_UID / TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT))
});
const db = admin.firestore();

const todayISO = () => new Date().toISOString().slice(0, 10);

async function main() {
  const today = todayISO();
  const snapshot = await db.collection(`artifacts/${APP_ID}/users/${TARGET_UID}/tasks`).get();

  const pending = snapshot.docs
    .map(doc => doc.data())
    .filter(t => t.status !== 'done' && !!t.dueDate && t.dueDate <= today)
    // Overdue first, then by due date, so the oldest slipped items are most visible.
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (pending.length === 0) {
    console.log('No pending tasks due today or overdue — skipping message.');
    return;
  }

  const lines = pending.map((t, i) => {
    const overdueTag = t.dueDate < today ? ' (overdue)' : '';
    const priorityTag = t.priority ? ` [${t.priority}]` : '';
    return `${i + 1}. ${t.title}${priorityTag}${overdueTag}`;
  });

  const text = `📋 Pending tasks for today (${today}):\n\n${lines.join('\n')}`;

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }

  console.log(`Sent reminder for ${pending.length} task(s).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
