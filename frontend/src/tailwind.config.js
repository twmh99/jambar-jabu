/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // 🎨 Warna utama tema Corporate Minimalist (Navy & Gold)
      colors: {
        // Tema global
        background: '#f9fafc', // latar putih lembut
        foreground: '#0b2545', // teks utama (navy)
        primary: '#0b2545', // navy elegan
        'primary-foreground': '#ffffff', // teks di atas navy
        accent: '#f7c948', // gold lembut (aksen utama)
        'accent-foreground': '#0b2545',
        muted: '#e0e6ed', // abu lembut untuk tabel/garis
        'muted-foreground': '#64748b', // teks sekunder
        ring: '#f7c948', // efek fokus emas
        border: '#d1d5db', // border netral
        input: '#ffffff', // bidang input putih
        card: '#ffffff', // kartu putih
        'card-foreground': '#0b2545',
        success: '#2ecc71', // hijau sukses
        warning: '#f1c40f', // kuning peringatan
        destructive: '#e74c3c', // merah error
      },

      // Font
      fontFamily: {
        display: ['Poppins', 'ui-sans-serif', 'system-ui'],
        body: ['Open Sans', 'ui-sans-serif', 'system-ui'],
      },

      // Bayangan halus dan elegan
      boxShadow: {
        elevated: '0 8px 20px rgba(11, 37, 69, 0.15)',
        soft: '0 2px 8px rgba(11, 37, 69, 0.1)',
      },

      // Border radius yang konsisten
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },

      // Transisi halus
      transitionDuration: {
        2000: '2000ms',
      },
    },
  },
  plugins: [],
};
