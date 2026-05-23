import { TextField } from "@/components/admin/admin-form";

type Club = {
  name?: string | null;
  slug?: string | null;
  zalo_phone?: string | null;
};

export function ClubFormFields({ initial }: { initial?: Club }) {
  return (
    <>
      <TextField
        name="name"
        label="Tên CLB"
        defaultValue={initial?.name}
        required
        placeholder="CLB ABC"
      />
      <TextField
        name="slug"
        label="Slug"
        defaultValue={initial?.slug}
        required
        placeholder="clb-abc"
        hint="Chỉ chữ thường, số, gạch ngang."
      />
      <TextField
        name="zalo_phone"
        label="SĐT/Zalo liên hệ"
        defaultValue={initial?.zalo_phone}
        required={false}
        placeholder="09xxxxxxxx"
      />
    </>
  );
}
