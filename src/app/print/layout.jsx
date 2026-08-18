import "./print.css";

/** @type {import("next").Metadata} */
export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * @param {Readonly<{ children: import("react").ReactNode }>} props
 */
export default function PrintLayout({ children }) {
  return <div className="print-root">{children}</div>;
}
