import { SelectField, TextField } from "@/components/admin/admin-form";

type Court = {
  name?: string | null;
  sort_order?: number | null;
  status?: string | null;
};

export function CourtFormFields({ initial }: { initial?: Court }) {
  return (
    <>
      <TextField
        name="name"
        label="Tên sân"
        defaultValue={initial?.name}
        required
        placeholder="Sân 1"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          name="sort_order"
          label="Thứ tự"
          type="number"
          defaultValue={
            initial?.sort_order != null ? String(initial.sort_order) : "0"
          }
          required
        />
        <SelectField
          name="status"
          label="Trạng thái"
          defaultValue={initial?.status ?? "available"}
          required
          options={[
            { value: "available", label: "Sẵn sàng" },
            { value: "in_use", label: "Đang dùng" },
            { value: "maintenance", label: "Bảo trì" },
          ]}
        />
      </div>
    </>
  );
}
