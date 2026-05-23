import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import {
  rejectPaymentAction,
  verifyPaymentAction,
} from "@/server/admin/payments";
import { PaymentDecisionForms } from "./payment-decision-forms";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  pending: "Chờ duyệt",
  paid: "Đã thanh toán",
  rejected: "Đã từ chối",
  unknown: "Không xác định",
};

const PROOF_URL_TTL_SECONDS = 600;

type Params = { params: Promise<{ id: string }> };

export default async function AdminPaymentDetailPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;

  const supabase = await createClient();
  const { data: registration } = await supabase
    .from("registrations")
    .select(
      `id, created_at, status, payment_status, payment_proof_path,
       athletes:athlete_id ( id, display_id, full_name, phone, club_name ),
       events:event_id ( id, name, kind, entry_fee_vnd,
         tournament:tournament_id ( id, name, slug )
       )`,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!registration) notFound();

  const athlete = Array.isArray(registration.athletes)
    ? registration.athletes[0]
    : registration.athletes;
  const event = Array.isArray(registration.events)
    ? registration.events[0]
    : registration.events;
  const tournament = event
    ? Array.isArray(event.tournament)
      ? event.tournament[0]
      : event.tournament
    : null;

  let proofUrl: string | null = null;
  if (registration.payment_proof_path) {
    const { data: signed } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(registration.payment_proof_path, PROOF_URL_TTL_SECONDS);
    proofUrl = signed?.signedUrl ?? null;
  }

  const verifyAction = verifyPaymentAction.bind(null, id);
  const rejectAction = rejectPaymentAction.bind(null, id);
  const isPending = registration.payment_status === "pending";
  const defaultAmount = event?.entry_fee_vnd ?? 0;

  return (
    <main className="flex-1 p-6 max-w-5xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/payments" className="underline">
          ← Duyệt thanh toán
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          {athlete?.full_name ?? "—"}{" "}
          <span className="text-muted-foreground text-base font-normal">
            {athlete?.display_id}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {tournament?.name} — {event?.name}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-medium mb-2">Bằng chứng chuyển khoản</h2>
          {proofUrl ? (
            <a href={proofUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed-URL preview, not an optimizable static asset */}
              <img
                src={proofUrl}
                alt="Bằng chứng chuyển khoản"
                className="rounded-md border border-border max-w-full"
              />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Không có ảnh đính kèm.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <dl className="text-sm space-y-1.5">
            <div className="flex gap-3">
              <dt className="w-28 text-muted-foreground">SĐT</dt>
              <dd>{athlete?.phone ?? "—"}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 text-muted-foreground">CLB</dt>
              <dd>{athlete?.club_name ?? "—"}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 text-muted-foreground">Loại</dt>
              <dd>{event?.kind}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 text-muted-foreground">Phí</dt>
              <dd className="tabular-nums">
                {event?.entry_fee_vnd?.toLocaleString("vi-VN") ?? "—"} VND
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 text-muted-foreground">Trạng thái</dt>
              <dd>{STATUS_LABEL[registration.payment_status]}</dd>
            </div>
          </dl>

          {isPending ? (
            <PaymentDecisionForms
              defaultAmount={defaultAmount}
              verifyAction={verifyAction}
              rejectAction={rejectAction}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Đăng ký này không còn ở trạng thái chờ duyệt.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
