import React from 'react'
import ReactDOM from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import App from './App'
import './i18n'
import './index.css'

{
  const href = `${import.meta.env.BASE_URL}logo.webp`
  let el = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'icon'
    el.type = 'image/webp'
    document.head.appendChild(el)
  }
  el.href = href
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrivyProvider
      appId="cmq8xavwq00dw0bjo5cj6slax"
      config={{
        loginMethods: ['wallet'],
        appearance: { showWalletLoginFirst: true },
        embeddedWallets: { createOnLogin: 'off' },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
)
