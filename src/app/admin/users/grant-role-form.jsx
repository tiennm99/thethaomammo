"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { grantRoleAction } from "@/server/admin/grants";

type Club = { id: string; name: string };

export function GrantRoleForm({ clubs }: { clubs: Club[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [role, setRole] = useState("admin");

  function onSubmit(fd: FormData) {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await grantRoleAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOk(true);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-3 max-w-xl">
      <div className="space-y-1.5">
        <label htmlFor="user_id" className="block text-sm font-medium">
          User ID *
        </label>
        <input
          id="user_id"
          name="user_id"
          required
          placeholder="UUID từ Supabase Auth"
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="role" className="block text-sm font-medium">
            Vai trò *
          </label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="admin">Quản trị</option>
            <option value="club_manager">Quản lý CLB</option>
            <option value="referee">Trọng tài</option>
            <option value="athlete">Vận động viên</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="scope_id" className="block text-sm font-medium">
            Phạm vi (CLB)
          </label>
          <select
            id="scope_id"
            name="scope_id"
            disabled={role !== "club_manager"}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50"
          >
            <option value="">— Không —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {ok && <p className="text-sm text-green-600">Đã cấp quyền.</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Đang cấp..." : "Cấp quyền"}
      </button>
    </form>
  );
}
