import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { signUpAction } from "@/server/auth/actions";

export const metadata = { title: "Đăng ký" };

export default function SignUpPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Đăng ký</h1>
          <p className="text-sm text-muted-foreground">Tạo tài khoản mới</p>
        </div>

        <AuthForm
          action={signUpAction}
          submitLabel="Đăng ký"
          successMessage="Kiểm tra email để xác nhận tài khoản."
          fields={[
            { name: "display_name", label: "Họ tên", autoComplete: "name" },
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Mật khẩu", type: "password", autoComplete: "new-password" },
          ]}
        />

        <p className="text-sm text-center">
          Đã có tài khoản?{" "}
          <Link href="/login" className="underline">Đăng nhập</Link>
        </p>
      </div>
    </main>
  );
}
