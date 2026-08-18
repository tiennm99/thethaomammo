"use client";

import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importAthletesAction } from "@/server/admin/athletes-import";
import { summarizeParsed, type ParseSummary } from "@/lib/csv/athletes-csv";

export function AthleteImportFlow() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<
    null | { inserted: number; errors: { row: number; message: string }[] }
  >(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError(null);
    setSummary(null);
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        if (result.errors.length) {
          setParseError(result.errors[0].message);
          return;
        }
        setSummary(summarizeParsed(result.data));
      },
      error: (err) => {
        setParseError(err.message);
      },
    });
  }

  function confirmImport() {
    if (!summary) return;
    if (
      !window.confirm(
        `Xác nhận nhập ${summary.valid} VĐV? Các hàng lỗi sẽ bị bỏ qua.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await importAthletesAction(summary.rows);
      if (result.error && !result.inserted) {
        setImportResult({
          inserted: 0,
          errors: [{ row: 0, message: result.error }],
        });
        return;
      }
      setImportResult({
        inserted: result.inserted ?? 0,
        errors: result.errors ?? [],
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="block text-sm"
        />
        {parseError && (
          <p className="mt-2 text-sm text-destructive">Lỗi đọc CSV: {parseError}</p>
        )}
      </section>

      {summary && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Xem trước</h2>
          <p className="text-sm text-muted-foreground">
            Tổng {summary.total} hàng · Hợp lệ {summary.valid} · Lỗi{" "}
            {summary.errors.length}
          </p>

          {summary.preview.length > 0 && (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Họ tên</th>
                    <th className="px-3 py-2 font-medium">DOB</th>
                    <th className="px-3 py-2 font-medium">Giới</th>
                    <th className="px-3 py-2 font-medium">CLB</th>
                    <th className="px-3 py-2 font-medium">SĐT</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.preview.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2">{r.full_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.dob || "—"}
                      </td>
                      <td className="px-3 py-2">{r.gender || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.club_name || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.phone || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {summary.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium">Hàng lỗi (sẽ bỏ qua):</p>
              <ul className="text-xs text-destructive list-disc pl-5 mt-1 max-h-40 overflow-auto">
                {summary.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    Hàng {e.row}: {e.message}
                  </li>
                ))}
                {summary.errors.length > 50 && (
                  <li>... và {summary.errors.length - 50} lỗi khác.</li>
                )}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={confirmImport}
            disabled={pending || summary.valid === 0}
            className="inline-flex h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Đang nhập..." : `Nhập ${summary.valid} VĐV`}
          </button>
        </section>
      )}

      {importResult && (
        <section className="rounded-md border border-border p-4 space-y-2">
          <p className="text-sm font-medium text-green-600">
            Đã nhập thành công {importResult.inserted} VĐV.
          </p>
          {importResult.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium">Hàng bị từ chối:</p>
              <ul className="text-xs text-destructive list-disc pl-5 mt-1 max-h-40 overflow-auto">
                {importResult.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    Hàng {e.row}: {e.message}
                  </li>
                ))}
                {importResult.errors.length > 50 && (
                  <li>... và {importResult.errors.length - 50} lỗi khác.</li>
                )}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
