import React from 'react'
import ReactDOM from 'react-dom/client'
import '../index.css'
import { StatusApp } from './status-app'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StatusApp />
  </React.StrictMode>,
)
