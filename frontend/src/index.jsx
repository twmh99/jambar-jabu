// ✅ FontAwesome Icons
import '@fortawesome/fontawesome-free/css/all.min.css'

// ✅ React Core
import React from 'react'
import ReactDOM from 'react-dom/client'

// ✅ App utama
import App from './App'

// ✅ Style global (pastikan nama file sesuai dengan project kamu)
import './index.css'

// ✅ Mount React App ke elemen #root di index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
