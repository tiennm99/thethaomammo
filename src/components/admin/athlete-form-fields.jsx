import {
  SelectField,
  TextField,
} from "@/components/admin/admin-form";

type Athlete = {
  full_name?: string | null;
  dob?: string | null;
  gender?: string | null;
  club_id?: string | null;
  club_name?: string | null;
  phone?: string | null;
};

type Club = { id: string; name: string };

type Props = {
  initial?: Athlete;
  clubs: Club[];
};

export function AthleteFormFields({ initial, clubs }: Props) {
  return (
    <>
      <TextField
        name="full_name"
        label="Họ tên"
        defaultValue={initial?.full_name}
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          name="dob"
          label="Ngày sinh"
          type="date"
          defaultValue={initial?.dob}
          required={false}
        />
        <SelectField
          name="gender"
          label="Giới tính"
          defaultValue={initial?.gender ?? ""}
          required={false}
          options={[
            { value: "", label: "— Không xác định —" },
            { value: "male", label: "Nam" },
            { value: "female", label: "Nữ" },
          ]}
        />
      </div>
      <SelectField
        name="club_id"
        label="CLB"
        defaultValue={initial?.club_id ?? ""}
        required={false}
        options={[
          { value: "", label: "— Không có —" },
          ...clubs.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <TextField
        name="club_name"
        label="Tên CLB tự nhập"
        defaultValue={initial?.club_name}
        required={false}
        hint="Dùng khi CLB không có trong danh sách trên."
      />
      <TextField
        name="phone"
        label="SĐT"
        defaultValue={initial?.phone}
        required={false}
      />
    </>
  );
}
