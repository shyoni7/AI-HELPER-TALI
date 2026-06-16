/**
 * GET /api/therapists — public therapist list for the booking widget.
 * Resilient: returns placeholder therapists when the DB is unavailable.
 */
import { NextResponse } from "next/server";
import { getPublicTherapists } from "@/lib/queries/therapists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const therapists = await getPublicTherapists();
  return NextResponse.json({
    therapists: therapists.map((t) => ({
      id: t.id,
      name: t.full_name,
      specialties: t.specialties,
      languages: t.languages,
    })),
  });
}
