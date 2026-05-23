import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { athletesToCsv } from "@/lib/csv/athletes-csv";

export const dynamic = "force-dynamic";

const EXPORT_CAP = 5000;

export async function GET() {
  // 404 (not 403) keeps parity with other admin RSCs that use notFound().
  if (!(await isAdmin())) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("athletes")
    .select("display_id, full_name, dob, gender, club_name, phone")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(EXPORT_CAP);

  if (error) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }

  const csv = athletesToCsv(data ?? []);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `athletes-${stamp}.csv`;

  // BOM so Excel renders Vietnamese diacritics correctly.
  return new NextResponse("﻿" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
