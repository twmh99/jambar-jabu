// ✅ FontAwesome Icons
import '@fortawesome/fontawesome-free/css/all.min.css'

// ✅ React Core
import React from 'react'
import ReactDOM from 'react-dom/client'

// ✅ App utama
import App from './App'

// ✅ Style global (pastikan nama file sesuai dengan project kamu)
import './index.css'

// ✅ Global handler: toggle arrow direction on all native <select.ds-input>
if (typeof window !== 'undefined') {
  const toggleSelectOpen = (el, state) => {
    if (!el?.classList) return;
    el.classList.toggle('ds-select-open', state);
  };

  const handleMouseDown = (e) => {
    const target = e.target;
    if (target?.tagName === 'SELECT' && target.classList.contains('ds-input')) {
      toggleSelectOpen(target, !target.classList.contains('ds-select-open'));
    }
  };
  const handleChange = (e) => {
    const target = e.target;
    if (target?.tagName === 'SELECT' && target.classList.contains('ds-input')) {
      toggleSelectOpen(target, false);
    }
  };
  const handleBlur = (e) => {
    const target = e.target;
    if (target?.tagName === 'SELECT' && target.classList.contains('ds-input')) {
      toggleSelectOpen(target, false);
    }
  };

  window.addEventListener('mousedown', handleMouseDown, true);
  window.addEventListener('change', handleChange, true);
  window.addEventListener('blur', handleBlur, true);
}

// ✅ Mount React App ke elemen #root di index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
