import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './pages'
import './styles/globals.css'
import { ViewerContext } from './features/vrmViewer/viewerContext'
import { Viewer } from './features/vrmViewer/viewer'
import { GlobalConfig } from './features/config/configApi'

// 创建默认值
const viewer = new Viewer()
const defaultValue = {
  viewer,
  updateConfig: (config: GlobalConfig) => {
    const cameraDistance = config?.characterConfig?.cameraDistance ?? 8.0
    viewer.setCameraDistance(cameraDistance)
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ViewerContext.Provider value={defaultValue}>
      <App />
    </ViewerContext.Provider>
  </React.StrictMode>,
)