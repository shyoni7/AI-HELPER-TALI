/**
 * Therapist read queries for the public site.
 *
 * Resilient by design (M1): if the DB is unavailable or empty, fall back to
 * placeholder content so the marketing site renders before Postgres is
 * provisioned. Once therapists are seeded, real rows take over automatically.
 */
import { query } from "@/lib/db";
import { placeholderTherapists } from "@/content/site";
import { logger } from "@/lib/logger";

export interface PublicTherapist {
  id: string;
  full_name: string;
  specialties: string[];
  languages: string[];
  bio: string;
}

export async function getPublicTherapists(): Promise<PublicTherapist[]> {
  try {
    const rows = await query<{
      id: string;
      full_name: string;
      specialties: string[];
      languages: string[];
    }>(
      `SELECT id, full_name, specialties, languages
         FROM therapists
        WHERE active = TRUE
        ORDER BY full_name`,
    );
    if (rows.length === 0) return placeholderTherapists;
    return rows.map((r) => ({
      ...r,
      bio: "", // bio column to be added in a later migration (SPEC §3)
    }));
  } catch (err) {
    logger.warn("therapists query failed; using placeholder content", {
      err: String(err),
    });
    return placeholderTherapists;
  }
}
