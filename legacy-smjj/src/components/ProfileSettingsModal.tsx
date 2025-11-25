"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "./ToastProvider";
import { useRouter } from "next/navigation";
import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

type Profile = {
  id: number;
  name: string;
  email?: string;
  avatar_data?: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  user: Profile | null;
  onUpdated: (user: Profile) => void;
}

export default function ProfileSettingsModal({
  open,
  onClose,
  user,
  onUpdated,
}: Props) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar_data || null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCroppingNewImage, setIsCroppingNewImage] = useState(false);
  const showToast = useToast();
  const router = useRouter();

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const getCroppedBlob = useCallback(async () => {
    if (!avatarPreview || !croppedAreaPixels) return null;
    const image = await createImage(avatarPreview);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const { width, height, x, y } = croppedAreaPixels;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        avatarFile?.type || "image/jpeg",
        0.9
      );
    });
  }, [avatarPreview, croppedAreaPixels, avatarFile]);

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setAvatarPreview(user?.avatar_data || null);
    setAvatarFile(null);
    setRemoveAvatar(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCroppingNewImage(false);
  }, [user, open]);

  if (!open || !user) return null;

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFileChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(user.avatar_data || null);
      setIsCroppingNewImage(false);
      setCroppedAreaPixels(null);
      return;
    }
    setAvatarFile(file);
    setRemoveAvatar(false);
    setIsCroppingNewImage(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setRemoveAvatar(true);
    setIsCroppingNewImage(false);
    setCroppedAreaPixels(null);
  };

  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setErrors({});

    if (!email || !email.includes("@")) {
      setErrors({ email: "Alamat email harus valid." });
      return;
    }
    if (newPassword || confirmPassword || currentPassword) {
      if (newPassword.length < 6) {
        setErrors({ newPassword: "Minimal 6 karakter." });
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrors({ confirmPassword: "Konfirmasi password tidak sama." });
        return;
      }
      if (!currentPassword) {
        setErrors({ currentPassword: "Masukkan password saat ini." });
        return;
      }
    }

    setIsSaving(true);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("email", email);
      if (currentPassword) form.append("currentPassword", currentPassword);
      if (newPassword) form.append("newPassword", newPassword);
      if (confirmPassword) form.append("confirmPassword", confirmPassword);
      if (avatarFile) {
        let blob = await getCroppedBlob();
        if (!blob && avatarFile) {
          blob = avatarFile;
        }
        if (blob) {
          const file = new File(
            [blob],
            avatarFile.name || "avatar.jpg",
            { type: avatarFile.type || "image/jpeg" }
          );
          form.append("avatar", file);
        }
      } else if (removeAvatar) {
        form.append("removeAvatar", "1");
      }
      const res = await fetch("/api/profile", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Gagal menyimpan." }));
        if (data.field) {
          setErrors({ [data.field]: data.error || "Gagal menyimpan profil." });
        } else {
          setErrors({ general: data.error || "Gagal menyimpan profil." });
        }
        throw new Error(data.error || "Gagal menyimpan profil.");
      }
      const data = await res.json();
      onUpdated(data.user);
      showToast({ type: "success", message: "Profil berhasil diperbarui." });
      router.refresh();
      onClose();
    } catch (err: any) {
      showToast({
        type: "error",
        message: err?.message || "Gagal memperbarui profil.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pengaturan Profil</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">
          Perbarui nama tampilan, email, foto profil, serta password Anda.
        </p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Foto Profil
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative h-48 flex-1 overflow-hidden rounded-2xl border border-dashed border-rose-200 bg-white/70">
                {avatarPreview ? (
                  isCroppingNewImage ? (
                    <Cropper
                      image={avatarPreview}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    Tidak ada foto
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="text-xs text-gray-600"
                />
                {isCroppingNewImage && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Zoom</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                )}
                {(avatarPreview || user.avatar_data) && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Hapus foto
                  </button>
                )}
                <p className="text-[11px] text-gray-400">
                  Maks 2MB. Format PNG/JPG.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              className={`mt-1 w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                errors.email
                  ? "border-red-400 focus:ring-red-100 dark:border-red-400 dark:bg-white/10 dark:text-white"
                  : "border-gray-200 focus:border-rose-400 focus:ring-rose-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
              }`}
              required
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              Ubah Password
            </p>
            <p className="text-xs text-gray-500">
              Isi bagian ini hanya jika ingin mengganti password.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-200">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    clearFieldError("currentPassword");
                  }}
                  className={`mt-1 w-full rounded-2xl border px-3 py-2 text-sm shadow-sm focus:outline-none ${
                    errors.currentPassword
                      ? "border-red-400 focus:ring-red-100 dark:border-red-400 dark:bg-white/10 dark:text-white"
                      : "border-gray-200 focus:border-rose-400 focus:ring-rose-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                  }`}
                  placeholder="••••••"
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.currentPassword}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-200">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    clearFieldError("newPassword");
                  }}
                  className={`mt-1 w-full rounded-2xl border px-3 py-2 text-sm shadow-sm focus:outline-none ${
                    errors.newPassword
                      ? "border-red-400 focus:ring-red-100 dark:border-red-400 dark:bg-white/10 dark:text-white"
                      : "border-gray-200 focus:border-rose-400 focus:ring-rose-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                  }`}
                  placeholder="Minimal 6 karakter"
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.newPassword}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-200">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  className={`mt-1 w-full rounded-2xl border px-3 py-2 text-sm shadow-sm focus:outline-none ${
                    errors.confirmPassword
                      ? "border-red-400 focus:ring-red-100 dark:border-red-400 dark:bg-white/10 dark:text-white"
                      : "border-gray-200 focus:border-rose-400 focus:ring-rose-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                  }`}
                  placeholder="Ulangi password baru"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </div>

          {errors.general && (
            <p className="text-xs text-red-500">{errors.general}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
              disabled={isSaving}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200/70 hover:shadow-xl disabled:opacity-60"
            >
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
