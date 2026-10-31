import React from 'react'
import ReactDOM from 'react-dom/client'
import '../index.css'
import { I18nProvider } from '@/lib/i18n'
import { StatusApp } from './status-app'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <StatusApp />
    </I18nProvider>
  </React.StrictMode>,
)
