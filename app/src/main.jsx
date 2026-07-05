import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LangProvider } from './ui/LangContext.jsx'

const style = document.createElement('style')
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; color: #e0e0e0; font-family: 'Inter', sans-serif; overflow-x: hidden; }
  #debug-error { position: fixed; top: 0; left: 0; right: 0; z-index: 99999; background: #e14b44; color: #fff; padding: 14px; font-size: 12px; font-family: monospace; white-space: pre-wrap; display: none; max-height: 200px; overflow-y: auto; }
`
document.head.appendChild(style)

window.addEventListener('error', (e) => {
  const el = document.getElementById('debug-error')
  if (el) { el.style.display = 'block'; el.textContent = 'RUNTIME ERROR: ' + e.message + '\\n' + (e.error?.stack || ''); }
})

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return (
      <div style={{background:'#e14b44',color:'#fff',padding:20,fontFamily:'monospace',fontSize:14}}>
        <h2>React Error</h2>
        <pre>{this.state.err.message}\n{this.state.err.stack}</pre>
      </div>
    )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div id="debug-error"></div>
    <ErrorBoundary>
      <LangProvider>
        <App />
      </LangProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
