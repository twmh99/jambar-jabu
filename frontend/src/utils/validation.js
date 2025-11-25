const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\-()\s]{8,}$/;

export const validateEmployeeData = (payload = {}) => {
  const errors = {};
  const nama = (payload.nama || "").trim();
  const email = (payload.email || "").trim();
  const telepon = (payload.telepon || "").trim();
  const jabatan = (payload.jabatan || "").trim();

  if (!nama) errors.nama = "Semua field wajib diisi.";
  if (!jabatan) errors.jabatan = "Semua field wajib diisi.";

  if (!email) errors.email = "Semua field wajib diisi.";
  else if (!emailRegex.test(email)) errors.email = "Format email tidak valid.";

  if (!telepon) errors.telepon = "Semua field wajib diisi.";
  else if (!phoneRegex.test(telepon)) errors.telepon = "Nomor telepon tidak valid.";

  return errors;
};

export const normalizeBackendErrors = (backendErrors = {}) => {
  const formatted = {};
  Object.entries(backendErrors).forEach(([key, value]) => {
    if (!value) return;
    formatted[key] = Array.isArray(value) ? value[0] : value;
  });
  return formatted;
};

export const firstErrorMessage = (errors = {}) => {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return "";
  const val = errors[firstKey];
  return Array.isArray(val) ? val[0] : val;
};
