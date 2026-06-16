/**
 * Placeholder marketing content for M1.
 *
 * Intentionally centralized so real copy can replace it without touching page
 * components. A future `site_content` table (see SPEC §3) can back this.
 */

export const site = {
  name: "מרכז טלי",
  tagline: "מרחב טיפולי חם ומקצועי — בקצב שלך",
  intro:
    "מרכז טיפולים המלווה מבוגרים, זוגות, מתבגרים וילדים. צוות המטפלים שלנו מציע מגוון גישות, מתוך הקשבה, כבוד ודיסקרטיות מלאה.",
  phone: "03-0000000",
  email: "hello@example.com",
  address: "רחוב הדוגמה 1, תל אביב",
} as const;

export interface Treatment {
  slug: string;
  title: string;
  description: string;
}

export const treatments: Treatment[] = [
  {
    slug: "individual",
    title: "טיפול פרטני",
    description:
      "מרחב אישי ובטוח לעיבוד רגשי, התמודדות עם חרדה, דיכאון, משברים ותקופות מעבר.",
  },
  {
    slug: "couples",
    title: "טיפול זוגי",
    description:
      "ליווי זוגות בשיפור התקשורת, פתרון קונפליקטים והעמקת הקשר.",
  },
  {
    slug: "teens",
    title: "מתבגרים וילדים",
    description:
      "התאמה רגישה לגיל ולשפה, בשיתוף ההורים, לתמיכה בצמיחה רגשית והתפתחות.",
  },
  {
    slug: "cbt",
    title: "CBT — טיפול קוגניטיבי-התנהגותי",
    description:
      "גישה ממוקדת ומבוססת-מחקר לשינוי דפוסי חשיבה והתנהגות.",
  },
];

export const values: { title: string; body: string }[] = [
  { title: "דיסקרטיות", body: "פרטיותך נשמרת בקפדנות בכל שלב." },
  { title: "התאמה אישית", body: "נשבץ עבורך מטפל/ת לפי הצורך והעדפת השפה." },
  { title: "נגישות", body: "קביעת פגישה פשוטה דרך האתר והעוזר/ת החכם/ה." },
];

/** Placeholder therapists shown when the DB is empty/unavailable (M1). */
export const placeholderTherapists = [
  {
    id: "demo-1",
    full_name: "ד\"ר נועה כהן",
    specialties: ["CBT", "פרטני", "חרדה"],
    languages: ["he", "en"],
    bio: "פסיכולוגית קלינית, מתמחה בטיפול קוגניטיבי-התנהגותי ובהתמודדות עם חרדה.",
  },
  {
    id: "demo-2",
    full_name: "מיכאל לוי",
    specialties: ["זוגי", "מתבגרים"],
    languages: ["he", "ru"],
    bio: "פסיכותרפיסט, מלווה זוגות ומתבגרים מתוך גישה מערכתית וחמה.",
  },
  {
    id: "demo-3",
    full_name: "שירה אברהם",
    specialties: ["פרטני", "ילדים"],
    languages: ["he"],
    bio: "מטפלת רגשית בילדים ובמשפחות, בדגש על משחק ויצירה ככלי תקשורת.",
  },
];
