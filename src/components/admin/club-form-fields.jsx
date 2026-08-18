import { TextField } from "@/components/admin/admin-form";

/**
 * @typedef {object} Club
 * @property {string | null} [name]
 * @property {string | null} [slug]
 * @property {string | null} [zalo_phone]
 */

/**
 * @param {{ initial?: Club }} props
 */
export function ClubFormFields({ initial }) {
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
