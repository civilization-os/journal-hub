import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'

interface MarkdownViewerProps {
  content: string
  className?: string
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div className={cn("prose prose-sm md:prose-base prose-zinc text-zinc-900 dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-img:rounded-xl prose-video:w-full prose-video:rounded-xl prose-iframe:w-full prose-iframe:aspect-video prose-iframe:rounded-xl", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
