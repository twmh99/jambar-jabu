"use client";

import { useState } from "react";

export default function EditMenuClient({ menu }: { menu?: any }) {
  // 🧠 Cegah crash jika menu belum tersedia
  const [preview, setPreview] = useState(menu?.image_url || "");

  // ⚠️ Jika data menu belum ada (undefined)
  if (!menu) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="text-center text-gray-600">
          <p className="text-lg font-medium mb-2">⚠️ Data menu tidak ditemukan</p>
          <p className="text-sm">Silakan kembali ke halaman daftar menu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          ✏️ Edit Menu
        </h1>

        <form
          action={`/api/menus/${menu.id}`}
          method="post"
          className="space-y-5"
        >
          <input type="hidden" name="_method" value="PUT" />

          {/* Nama Menu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Menu
            </label>
            <input
              name="name"
              defaultValue={menu.name}
              required
              className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#e31c1c]"
            />
          </div>

          {/* Harga */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Harga
            </label>
            <input
              name="price"
              type="number"
              defaultValue={menu.price}
              min="0"
              required
              className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#e31c1c]"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating
            </label>
            <select
              name="rating"
              defaultValue={menu.rating ?? 4}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#e31c1c]"
            >
              <option value={5}>5/5</option>
              <option value={4}>4/5</option>
            </select>
          </div>

          {/* URL Gambar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Gambar
            </label>
            <input
              name="image_url"
              defaultValue={menu.image_url || ""}
              onChange={(e) => setPreview(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#e31c1c]"
            />
          </div>

          {/* Preview Gambar */}
          {preview && (
            <div className="flex justify-center mt-4">
              <img
                src={preview}
                alt="Preview Menu"
                className="w-64 h-40 object-cover rounded-lg shadow-sm border border-gray-200"
              />
            </div>
          )}

          {/* Tombol Simpan */}
          <div className="flex justify-center mt-6">
            <button
              type="submit"
              className="bg-[#e31c1c] text-white px-5 py-2.5 rounded-lg shadow hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition-all font-medium"
            >
              💾 Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
