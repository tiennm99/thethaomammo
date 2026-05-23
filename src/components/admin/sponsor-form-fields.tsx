import { SelectField, TextField } from "@/components/admin/admin-form";

type Sponsor = {
  name?: string | null;
  tier?: string | null;
  link_url?: string | null;
  sort_order?: number | null;
  invert_in_light?: boolean | null;
};

type Props = {
  initial?: Sponsor;
  currentLogoUrl?: string | null;
};

export function SponsorFormFields({ initial, currentLogoUrl }: Props) {
  return (
    <>
      <TextField
        name="name"
        label="Tên nhà tài trợ"
        defaultValue={initial?.name}
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          name="tier"
          label="Hạng"
          defaultValue={initial?.tier ?? "partner"}
          required
          options={[
            { value: "gold", label: "Vàng" },
            { value: "silver", label: "Bạc" },
            { value: "bronze", label: "Đồng" },
            { value: "partner", label: "Đối tác" },
            { value: "court", label: "Nhà tài trợ sân" },
          ]}
        />
        <TextField
          name="sort_order"
          label="Thứ tự"
          type="number"
          defaultValue={
            initial?.sort_order != null ? String(initial.sort_order) : "0"
          }
          required
        />
      </div>
      <TextField
        name="link_url"
        label="Website"
        type="url"
        defaultValue={initial?.link_url}
        required={false}
        placeholder="https://..."
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="invert_in_light"
          defaultChecked={initial?.invert_in_light ?? false}
        />
        Đảo màu logo trên nền sáng (logo trắng)
      </label>
      <div className="space-y-1.5">
        <label htmlFor="logo" className="block text-sm font-medium">
          Logo
        </label>
        {currentLogoUrl && (
          <div className="rounded-md border border-border bg-muted/30 p-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview, no optimization needed */}
            <img
              src={currentLogoUrl}
              alt="Logo hiện tại"
              className="max-h-20"
            />
          </div>
        )}
        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="block w-full text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Tối đa 5MB. Định dạng JPG/PNG/WebP/SVG.{" "}
          {currentLogoUrl ? "Để trống để giữ logo hiện tại." : ""}
        </p>
      </div>
    </>
  );
}
