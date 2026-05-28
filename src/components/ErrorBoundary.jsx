import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { pageName = 'this page' } = this.props
    const isDev = import.meta.env.DEV

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">
              Something went wrong on {pageName}
            </h2>
            <p className="text-sm text-red-700 mb-6">
              An unexpected error occurred. Your data is safe — this is a display issue only.
            </p>
            {isDev && this.state.error && (
              <details className="text-left mb-4 bg-red-100 rounded-lg p-3">
                <summary className="text-xs font-mono text-red-800 cursor-pointer mb-2">
                  Error details (dev only)
                </summary>
                <pre className="text-xs text-red-700 overflow-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="flex items-center gap-2 mx-auto bg-red-700 hover:bg-red-800 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}
