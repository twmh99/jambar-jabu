import React from "react";

export default function ActionButtons({ onEdit, onDelete, onVerify }) {
  return (
    <div className="flex gap-2">
      {onEdit && (
        <button onClick={onEdit} className="btn-edit">
          <i className="fa-solid fa-pen" /> Edit
        </button>
      )}
      {onDelete && (
        <button
          onClick={() => {
            if (window.confirm("Hapus data ini?")) {
              onDelete();
            }
          }}
          className="btn-delete"
        >
          <i className="fa-solid fa-trash" /> Hapus
        </button>
      )}
      {onVerify && (
        <button onClick={onVerify} className="btn-verify">
          <i className="fa-solid fa-clipboard-check" /> Verifikasi
        </button>
      )}
    </div>
  );
}
