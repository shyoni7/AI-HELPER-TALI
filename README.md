# AI-HELPER-TALI

סוכן AI לאתר של מרכז מטפלים. שלוש יכולות שמתחברות לאחת:

1. **צ'אט תמיכה ללקוחות** — שאלות על המרכז, הטיפולים והמטפלים.
2. **תיאום פגישות** מול Google Calendar — יומן מרכזי + יומני המטפלים, בדיקת זמינות אמיתית, קביעה וביטול דרך הצ'אט.
3. **רשימת המתנה חכמה** — כשמתבטלת פגישה, פנייה יזומה (מייל בשלב 1, תשתית ל‑WhatsApp בשלב 2) למתאים/ה ביותר ברשימה עם הצעת הזמן שהתפנה.

> **חשוב:** פרטיות ואבטחת מידע בריאותי נבנו לתוך המערכת מההתחלה. ראו `PLAN.md` §פרטיות.

## סטאק

- **TypeScript + Next.js (App Router)**, פריסה ל‑**Vercel**.
- **מנוע:** Claude (Anthropic SDK) עם Tool Use — מודל `claude-opus-4-8`, adaptive thinking, לולאת כלים ידנית.
- **DB:** Postgres. טבלאות: `therapists`, `patients`, `appointments`, `waitlist`, `conversations` (ראו `db/schema.sql`).
- **יומן:** Google Calendar (freebusy לזמינות, watch לזיהוי ביטולים) — בשלב 0 מחובר כ‑stub מטיפוס.
- **התראות:** מייל בשלב 1, תשתית מוכנה ל‑WhatsApp בשלב 2.

## מבנה הפרויקט

```
db/schema.sql              מודל הנתונים (5 טבלאות) + אינדקסים + הגנות
scripts/migrate.mjs        החלת הסכמה
scripts/seed.mjs           נתוני דמו (מטפלים)
src/
  app/
    page.tsx               ממשק צ'אט מינימלי
    api/chat/route.ts       נקודת קצה לתור משתמש
  agent/
    client.ts              לקוח Anthropic (singleton)
    engine.ts              לולאת Tool Use ידנית
    system-prompt.ts       הנחיות הסוכן (כולל כללי בטיחות)
    tools/                 הגדרות הכלים (מידע, זמינות, קביעה, ביטול, רשימה)
    calendar/google.ts     שכבת Google Calendar (port + stub + מחשבון slots)
  notifications/           מייל (שלב 1) + WhatsApp (שלב 2, תשתית)
  waitlist/matcher.ts      התאמה וניקוד מועמדים + תזמור פנייה
  lib/                     env, db, logger מודע-פרטיות
  types/domain.ts          טיפוסי דומיין
```

## הרצה מקומית

```bash
npm install
cp .env.example .env          # מלאו ANTHROPIC_API_KEY, DATABASE_URL ו-AUTH_SECRET
npm run db:migrate            # החלת db/schema.sql
npm run db:seed               # מטפלי דמו (אופציונלי)
npm run dev                   # http://localhost:3000
```

### אזור צוות (M2)
התחברות הצוות היא בטלפון + קוד חד-פעמי (OTP). יצירת משתמש צוות ראשון (מנהל):

```bash
node --env-file=.env scripts/add-staff.mjs --phone 0500000000 --name "מנהל/ת" --role manager
```

כניסה דרך `/staff/login`. ללא ספק SMS מוגדר, קוד ה-OTP מודפס ל-console (פיתוח בלבד).

בדיקות איכות:

```bash
npm run typecheck
npm run lint
```

## פריסה ל‑Vercel

1. חברו את הריפו ל‑Vercel.
2. הגדירו את משתני הסביבה מ‑`.env.example` ב‑Project Settings (אל תעלו `.env`).
3. הריצו את ההגירה מול ה‑Postgres הניהולי (`npm run db:migrate` עם `DATABASE_URL` של הסביבה).

## סטטוס

שלב 0 (השלד) הושלם: פרויקט Next.js, מודל נתונים, שלד מנוע הסוכן והגדרת הכלים, README ו‑PLAN.
שכבת Google Calendar והמייל מחוברות כ‑stubs מטיפוס — מוכנות למילוי בשלב 1 ללא שינוי בקוד הקורא. ראו `PLAN.md` למפת הדרכים המלאה.
