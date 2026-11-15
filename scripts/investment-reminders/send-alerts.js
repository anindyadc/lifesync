// Sends a Telegram alert for Investment holdings that are about to mature, whose
// lock-in is about to end, or that are past maturity but still marked active.
// Same infrastructure as scripts/task-reminders (service-account Firestore read +
// Telegram Bot API, free Spark plan, no public endpoint).
//
// Amounts are AES-encrypted in Firestore with a key that only the web app holds, so
// this script deliberately never reads or prints them — alerts carry name/type/holder/
// date only, which also keeps the encryption key out of GitHub Actions secrets.
const admin = require('firebase-admin');

const APP_ID = 'default-app-id';
const { FIREBASE_SERVICE_ACCOUNT, TARGET_UID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
// Days-before-event on which to alert, e.g. "30,7,1" (0 = on the day itself).
const ALERT_DAYS = (process.env.ALERT_DAYS || '30,7,1,0')
  .split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isInteger(n) && n >= 0);
// Closed statuses mirror CLOSED_STATUSES in src/apps/investment/constants.js.
const CLOSED = ['sold', 'matured', 'closed', 'renewed'];

if (!FIREBASE_SERVICE_ACCOUNT || !TARGET_UID || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Missing one of FIREBASE_SERVICE_ACCOUNT / TARGET_UID / TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

// Dates are stored as 'YYYY-MM-DD' strings; compare whole days in IST (the schedule's zone).
const istToday = () => {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
};
const parseDay = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const daysUntil = (day, today) => Math.round((day - today) / 86400000);
const when = (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

async function main() {
  const today = istToday();
  const snapshot = await db.collection(`artifacts/${APP_ID}/users/${TARGET_UID}/investment`).get();
  const lines = [];

  for (const docSnap of snapshot.docs) {
    const inv = docSnap.data();
    if (CLOSED.includes(inv.status)) continue;
    const label = `${inv.type || 'Investment'} — ${inv.name || 'Unnamed'}${inv.holder ? ` (${inv.holder})` : ''}`;

    const maturity = parseDay(inv.maturityDate);
    if (maturity) {
      const n = daysUntil(maturity, today);
      if (ALERT_DAYS.includes(n)) lines.push({ sort: n, text: `⏰ ${label} matures ${when(n)} (${inv.maturityDate})` });
      else if (n < 0) lines.push({ sort: n, text: `⚠️ ${label} matured on ${inv.maturityDate} — still marked active, mark it closed in the app` });
    }
    const lockIn = parseDay(inv.lockInEnd);
    if (lockIn) {
      const n = daysUntil(lockIn, today);
      if (ALERT_DAYS.includes(n)) lines.push({ sort: n, text: `🔓 ${label} lock-in ends ${when(n)} (${inv.lockInEnd})` });
    }
  }

  if (lines.length === 0) {
    console.log('No investment alerts due today — skipping message.');
    return;
  }

  lines.sort((a, b) => a.sort - b.sort);
  const text = `💰 Investment alerts (${today.toISOString().slice(0, 10)}):\n\n${lines.map(l => l.text).join('\n')}`;

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });
  if (!res.ok) throw new Error(`Telegram API error ${res.status}: ${await res.text()}`);
  console.log(`Sent ${lines.length} investment alert(s).`);
}

main().catch(err => { console.error(err); process.exit(1); });
