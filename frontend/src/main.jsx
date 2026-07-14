import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
/* Split styles — replaces monolithic index.css */
import './styles/base.css'
import './styles/animations.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/pages/landing.css'
import './styles/pages/results.css'
import './styles/pages/insights.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
