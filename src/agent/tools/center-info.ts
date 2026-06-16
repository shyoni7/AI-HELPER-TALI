/**
 * Tool: get_center_info — customer-support knowledge lookup.
 *
 * Phase 0 returns curated, non-clinical facts about the center, treatments, and
 * therapists from the DB (therapists) plus a small static info block. Phase 1
 * can back this with a proper CMS / retrieval layer.
 */
import type { Tool, ToolResult } from "./types";
import { query } from "@/lib/db";
import type { Therapist } from "@/types/domain";

interface Input {
  topic: "center" | "treatments" | "therapists";
}

const STATIC_INFO: Record<string, string> = {
  center:
    "מרכז טיפולים המציע מגוון טיפולים פסיכולוגיים ורגשיים. ניתן לקבוע פגישות דרך הצ'אט ולהצטרף לרשימת המתנה כשאין זמן פנוי.",
  treatments:
    "המרכז מציע טיפול פרטני, טיפול זוגי, טיפול במתבגרים וילדים, וגישות שונות כגון CBT. ההתאמה למטפל נעשית לפי הצורך והעדפת השפה.",
};

export const centerInfoTool: Tool<Input> = {
  name: "get_center_info",
  description:
    "ענה על שאלות כלליות של לקוחות על המרכז, סוגי הטיפולים והמטפלים. החזר מידע עובדתי ולא-קליני בלבד. השתמש בכלי הזה לפני שאתה עונה משאלות ידע על המרכז.",
  input_schema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        enum: ["center", "treatments", "therapists"],
        description:
          "הנושא לשליפה: center (על המרכז), treatments (סוגי טיפולים), therapists (רשימת מטפלים).",
      },
    },
    required: ["topic"],
  },
  async execute(input: Input): Promise<ToolResult> {
    if (input.topic === "therapists") {
      const rows = await query<Therapist>(
        `SELECT id, full_name, specialties, languages, default_slot_minutes
           FROM therapists WHERE active = TRUE ORDER BY full_name`,
      );
      return {
        content: rows.map((t) => ({
          id: t.id,
          name: t.full_name,
          specialties: t.specialties,
          languages: t.languages,
          session_minutes: t.default_slot_minutes,
        })),
      };
    }
    return { content: STATIC_INFO[input.topic] ?? STATIC_INFO.center };
  },
};
