import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './pages'
import './styles/globals.css'
import { ViewerContext } from './features/vrmViewer/viewerContext'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ViewerContext.Provider value={{ viewer: null as any }}>
      <App />
    </ViewerContext.Provider>
  </React.StrictMode>,
)