import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/admin-form";

type Tournament = {
  slug?: string | null;
  name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  venue?: string | null;
  status?: string | null;
  zalo_group_url?: string | null;
  payment_info_text?: string | null;
};

function toDateInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function TournamentFormFields({ initial }: { initial?: Tournament }) {
  return (
    <>
      <TextField
        name="name"
        label="Tên giải đấu"
        defaultValue={initial?.name}
        required
        placeholder="Giải mở rộng 2026"
      />
      <TextField
        name="slug"
        label="Slug (URL)"
        defaultValue={initial?.slug}
        required
        placeholder="giai-mo-rong-2026"
        hint="Chỉ chữ thường, số, gạch ngang. Dùng cho URL /giai/<slug>."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          name="starts_at"
          label="Bắt đầu"
          type="datetime-local"
          defaultValue={toDateInput(initial?.starts_at)}
          required={false}
        />
        <TextField
          name="ends_at"
          label="Kết thúc"
          type="datetime-local"
          defaultValue={toDateInput(initial?.ends_at)}
          required={false}
        />
      </div>
      <TextField
        name="venue"
        label="Địa điểm"
        defaultValue={initial?.venue}
        required={false}
      />
      <SelectField
        name="status"
        label="Trạng thái"
        defaultValue={initial?.status ?? "draft"}
        required
        options={[
          { value: "draft", label: "Nháp" },
          { value: "open", label: "Mở đăng ký" },
          { value: "in_progress", label: "Đang diễn ra" },
          { value: "completed", label: "Đã kết thúc" },
          { value: "archived", label: "Lưu trữ" },
        ]}
      />
      <TextField
        name="zalo_group_url"
        label="Link nhóm Zalo"
        type="url"
        defaultValue={initial?.zalo_group_url}
        required={false}
        placeholder="https://zalo.me/g/..."
      />
      <TextAreaField
        name="payment_info_text"
        label="Thông tin thanh toán"
        defaultValue={initial?.payment_info_text}
        required={false}
        rows={4}
        hint="Hiển thị cho người đăng ký bên cạnh mã QR."
      />
    </>
  );
}
