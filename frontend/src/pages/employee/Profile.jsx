import React, { useState } from "react";
import { Input, Label } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";

/**
 * 👤 Halaman Profil Pegawai — Fitur Ubah Password
 * Menghubungkan ke endpoint Laravel: POST /api/pegawai/change-password
 */
export default function Profile() {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/pegawai/change-password", form);
      toast.success("Password berhasil diubah ✅");
      setForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Gagal mengubah password";
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">Ubah Password</h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>Password Lama</Label>
          <Input
            type="password"
            name="current_password"
            value={form.current_password}
            onChange={onChange}
            required
          />
        </div>

        <div>
          <Label>Password Baru</Label>
          <Input
            type="password"
            name="new_password"
            value={form.new_password}
            onChange={onChange}
            required
          />
        </div>

        <div>
          <Label>Konfirmasi Password Baru</Label>
          <Input
            type="password"
            name="new_password_confirmation"
            value={form.new_password_confirmation}
            onChange={onChange}
            required
          />
        </div>

        <Button type="submit" className="w-full">
          Simpan Perubahan
        </Button>
      </form>
    </div>
  );
}
