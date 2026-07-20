import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  wide?: boolean
  compact?: boolean
}

export function PageLayout({ children, title, description, actions, wide = false, compact = false }: PageLayoutProps) {
  const maxWidth = wide ? 'max-w-[1680px]' : 'max-w-[1400px]'

  return (
    <div className="flex-1 w-full min-w-0 min-h-screen flex flex-col items-center bg-background">
      {(title || actions) && (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b w-full flex justify-center">
          <div className={`w-full ${maxWidth} flex items-center justify-between px-6 lg:px-8 ${compact ? 'py-4' : 'py-6'}`}>
            <div className="flex flex-col gap-1.5">
              {title && <div className="text-2xl font-bold tracking-tight text-foreground flex items-center">{title}</div>}
              {description && <div className="text-sm text-muted-foreground">{description}</div>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </header>
      )}
      
      {/* Main Content Area */}
      <main className={`flex-1 w-full ${maxWidth} px-6 lg:px-8 ${compact ? 'py-5' : 'py-8'} flex flex-col`}>
        {children}
      </main>

      {/* Footer Area */}
      <footer className="mt-auto py-6 w-full flex justify-center border-t bg-muted/20">
        <div className={`w-full ${maxWidth} px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-muted-foreground`}>
          <p>© {new Date().getFullYear()} Journal Hub. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-foreground transition-colors">关于我们</a>
            <a href="#" className="hover:text-foreground transition-colors">隐私政策</a>
            <a href="#" className="hover:text-foreground transition-colors">服务条款</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
