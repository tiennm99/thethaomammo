"use client";

export function PrintActions() {
  return (
    <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          height: 36,
          padding: "0 14px",
          background: "#000",
          color: "#fff",
          border: 0,
          borderRadius: 6,
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        In trang này
      </button>
    </div>
  );
}
