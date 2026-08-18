import {
  SelectField,
  TextField,
} from "@/components/admin/admin-form";

type Event = {
  name?: string | null;
  kind?: string | null;
  gender?: string | null;
  age_category_id?: string | null;
  entry_fee_vnd?: number | null;
  capacity?: number | null;
  color_code?: string | null;
};

type AgeCategory = { id: string; name: string };

type Props = {
  initial?: Event;
  ageCategories: AgeCategory[];
};

export function EventFormFields({ initial, ageCategories }: Props) {
  return (
    <>
      <TextField
        name="name"
        label="Tên nội dung"
        defaultValue={initial?.name}
        required
        placeholder="Đơn nam U18"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          name="kind"
          label="Loại"
          defaultValue={initial?.kind ?? "singles"}
          required
          options={[
            { value: "singles", label: "Đơn" },
            { value: "doubles", label: "Đôi" },
          ]}
        />
        <SelectField
          name="gender"
          label="Giới tính"
          defaultValue={initial?.gender ?? "male"}
          required
          options={[
            { value: "male", label: "Nam" },
            { value: "female", label: "Nữ" },
            { value: "mixed", label: "Đôi nam nữ" },
          ]}
        />
      </div>
      <SelectField
        name="age_category_id"
        label="Nhóm tuổi"
        defaultValue={initial?.age_category_id ?? ""}
        required={false}
        options={[
          { value: "", label: "— Không phân loại —" },
          ...ageCategories.map((a) => ({ value: a.id, label: a.name })),
        ]}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          name="entry_fee_vnd"
          label="Phí đăng ký (VND)"
          type="number"
          defaultValue={
            initial?.entry_fee_vnd != null ? String(initial.entry_fee_vnd) : "0"
          }
          required
        />
        <TextField
          name="capacity"
          label="Sức chứa (đội/VĐV)"
          type="number"
          defaultValue={
            initial?.capacity != null ? String(initial.capacity) : ""
          }
          required={false}
        />
      </div>
      <TextField
        name="color_code"
        label="Mã màu"
        defaultValue={initial?.color_code}
        required={false}
        placeholder="#3b82f6"
        hint="Định dạng #RRGGBB. Dùng để tô màu lịch thi đấu."
      />
    </>
  );
}
