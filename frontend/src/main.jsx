import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Upload from './component/upload.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Upload />
  </StrictMode>,
)

export default App;