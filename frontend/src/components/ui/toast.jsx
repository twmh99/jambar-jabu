import React from "react";

/**
 * 💬 Toast Global — SMPJ Blue Style (stabil di dark & light mode)
 * Gradien biru-aqua lembut sesuai tema SMPJ. Tidak ada campuran kuning/gelap.
 */

let listeners = [];

export const toast = {
  success: (msg) => listeners.forEach((l) => l({ msg, type: "success" })),
  error: (msg) => listeners.forEach((l) => l({ msg, type: "error" })),
  info: (msg) => listeners.forEach((l) => l({ msg, type: "info" })),
};

export const ToastViewport = () => {
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    const handler = (item) => {
      const id = Date.now();
      setItems((prev) => [...prev, { id, ...item }]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4000);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  return (
    <div
      className="fixed right-5 top-5 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-live="assertive"
    >
      {items.map((i) => {
        // 🎨 Warna sesuai tipe
        let gradient, border, shadow;
        if (i.type === "success") {
          gradient = "linear-gradient(135deg, #22c55e, #16a34a)";
          border = "#16a34a";
          shadow = "0 6px 20px -5px rgba(34,197,94,0.4)";
        } else if (i.type === "error") {
          gradient = "linear-gradient(135deg, #ef4444, #b91c1c)";
          border = "#b91c1c";
          shadow = "0 6px 20px -5px rgba(239,68,68,0.4)";
        } else {
          // Info → warna khas SMPJ (biru → aqua)
          gradient = "linear-gradient(135deg, #3b82f6, #06b6d4)";
          border = "#0ea5e9";
          shadow = "0 6px 20px -5px rgba(59,130,246,0.4)";
        }

        return (
          <div
            key={i.id}
            className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-[15px] font-medium animate-fadeIn backdrop-blur-md transition-all duration-500"
            style={{
              color: "white",
              borderColor: border,
              background: gradient,
              boxShadow: shadow,
            }}
          >
            <i
              className={`fa-solid ${
                i.type === "success"
                  ? "fa-circle-check"
                  : i.type === "error"
                  ? "fa-circle-xmark"
                  : "fa-circle-info"
              } text-[18px]`}
            />
            <span className="tracking-tight">{i.msg}</span>
          </div>
        );
      })}
    </div>
  );
};
