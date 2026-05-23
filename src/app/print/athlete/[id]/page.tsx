import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PrintActions } from "@/components/print/print-actions";

export const revalidate = 300;

const loadAthlete = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_athletes_public")
    .select(
      "id, display_id, full_name, gender, club_name, club_resolved_name",
    )
    .eq("id", id)
    .maybeSingle();
  return data;
});

const GENDER_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
};

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const data = await loadAthlete(id);
  if (!data) return { title: "Không tìm thấy VĐV" };
  return { title: `Thẻ VĐV — ${data.full_name}`, robots: { index: false } };
}

export default async function PrintAthletePage({ params }: Params) {
  const { id } = await params;
  const athlete = await loadAthlete(id);
  if (!athlete) notFound();

  const clubName = athlete.club_resolved_name ?? athlete.club_name;

  return (
    <main>
      <PrintActions />
      <article className="avoid-break" style={{ marginTop: 12 }}>
        <header style={{ borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 16 }}>
          <h1 style={{ fontSize: "18pt", fontWeight: 700 }}>THẺ VẬN ĐỘNG VIÊN</h1>
          <p style={{ fontSize: "10pt" }}>Thể Thao Mầm Mơ</p>
        </header>

        <table>
          <tbody>
            <tr>
              <th style={{ width: "30%" }}>Họ và tên</th>
              <td style={{ fontWeight: 600, fontSize: "14pt" }}>{athlete.full_name}</td>
            </tr>
            <tr>
              <th>Mã VĐV</th>
              <td>{athlete.display_id ?? "—"}</td>
            </tr>
            <tr>
              <th>Giới tính</th>
              <td>
                {athlete.gender ? (GENDER_LABEL[athlete.gender] ?? athlete.gender) : "—"}
              </td>
            </tr>
            <tr>
              <th>CLB</th>
              <td>{clubName ?? "—"}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", gap: 32 }}>
          <div style={{ flex: 1, borderTop: "1px solid #000", paddingTop: 6, textAlign: "center", fontSize: "11pt" }}>
            Chữ ký VĐV
          </div>
          <div style={{ flex: 1, borderTop: "1px solid #000", paddingTop: 6, textAlign: "center", fontSize: "11pt" }}>
            Xác nhận BTC
          </div>
        </div>
      </article>
    </main>
  );
}
