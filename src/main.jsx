import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// FullCalendar CSS imports are now handled by the FullCalendar JavaScript itself (v6+).
// Custom styling will be applied via MaturityCalendar.css.

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)