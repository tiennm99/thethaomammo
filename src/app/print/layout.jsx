import type { Metadata } from "next";
import "./print.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PrintLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="print-root">{children}</div>;
}
