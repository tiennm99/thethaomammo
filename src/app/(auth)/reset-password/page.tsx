import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { resetPasswordAction } from "@/server/auth/actions";

export const metadata = { title: "Đặt lại mật khẩu" };

export default function ResetPasswordPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Đặt lại mật khẩu</h1>
          <p className="text-sm text-muted-foreground">
            Nhập email — chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </p>
        </div>

        <AuthForm
          action={resetPasswordAction}
          submitLabel="Gửi liên kết"
          successMessage="Đã gửi email. Kiểm tra hộp thư của bạn."
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
          ]}
        />

        <p className="text-sm text-center">
          <Link href="/login" className="underline">Quay lại đăng nhập</Link>
        </p>
      </div>
    </main>
  );
}
