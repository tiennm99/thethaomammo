import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { signInAction } from "@/server/auth/actions";

export const metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Đăng nhập</h1>
          <p className="text-sm text-muted-foreground">Sử dụng email + mật khẩu</p>
        </div>

        <AuthForm
          action={signInAction}
          submitLabel="Đăng nhập"
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Mật khẩu", type: "password", autoComplete: "current-password" },
          ]}
        />

        <div className="text-sm text-center space-y-1">
          <p>
            Chưa có tài khoản?{" "}
            <Link href="/signup" className="underline">Đăng ký</Link>
          </p>
          <p>
            <Link href="/reset-password" className="underline text-muted-foreground">Quên mật khẩu?</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
