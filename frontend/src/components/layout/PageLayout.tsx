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
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              {title && <h1 className="text-base font-semibold">{title}</h1>}
              {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>
      )}
      <div className="flex-1 px-8 py-6">{children}</div>
    </main>
  )
}
