import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  title?: string
  description?: string
  actions?: ReactNode
}

export function PageLayout({ children, title, description, actions }: PageLayoutProps) {
  return (
    <main className="flex-1 w-full min-w-0 min-h-screen flex flex-col">
      {(title || actions) && (
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-8 py-5">
            <div>
              {title && <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>}
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </header>
      )}
      <div className="flex-1 max-w-7xl mx-auto w-full px-8 py-8">{children}</div>
    </main>
  )
}
