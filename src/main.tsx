import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
// Shared suite tokens first, then C1's semantic layer on top of them.
import './tokens.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
