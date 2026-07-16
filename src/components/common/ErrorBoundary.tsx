import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/common/MaterialIcon'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <MaterialIcon name="error" className="text-[30px]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              An unexpected error occurred. Reload the page to continue — if the problem
              persists, contact your administrator.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>
            <MaterialIcon name="refresh" className="text-[18px]" />
            Reload page
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
