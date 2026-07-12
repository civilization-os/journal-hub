import * as React from 'react'
import { cn } from '@/lib/utils'
import { Bold, Italic, List, ListOrdered, Quote, Code, Heading } from 'lucide-react'

interface RichEditorProps {
  content: string
  onChange: (text: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function RichEditor({
  content,
  onChange,
  placeholder = '开始记录你的今天...',
  className = '',
  minHeight = '200px',
}: RichEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    
    const replacement = prefix + (selected || '') + suffix
    const newValue = text.substring(0, start) + replacement + text.substring(end)
    
    onChange(newValue)
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    }, 50)
  }

  const toolbarItems = [
    { icon: Bold, action: () => insertMarkdown('**', '**'), title: '加粗' },
    { icon: Italic, action: () => insertMarkdown('*', '*'), title: '斜体' },
    { icon: Heading, action: () => insertMarkdown('\n## ', '\n'), title: '标题' },
    { icon: List, action: () => insertMarkdown('\n- ', ''), title: '无序列表' },
    { icon: ListOrdered, action: () => insertMarkdown('\n1. ', ''), title: '有序列表' },
    { icon: Quote, action: () => insertMarkdown('\n> ', ''), title: '引用' },
    { icon: Code, action: () => insertMarkdown('`', '`'), title: '代码' },
  ]

  return (
    <div className={cn('border border-zinc-200 rounded-lg overflow-hidden bg-white focus-within:border-zinc-500 transition-all duration-200', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-zinc-150 px-2 py-1.5 bg-zinc-50/50 flex-wrap">
        {toolbarItems.map(({ icon: Icon, action, title }, i) => (
          <button
            key={i}
            type="button"
            title={title}
            onClick={action}
            className="p-1.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded-md transition-all cursor-pointer"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Editor Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
        className="w-full px-4 py-3 text-xs text-zinc-950 leading-relaxed placeholder:text-zinc-400 resize-y border-none focus:outline-none focus:ring-0 bg-transparent"
      />
    </div>
  )
}
