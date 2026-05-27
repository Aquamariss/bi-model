import { cn } from '@/lib/utils'

interface Props {
  html: string
  className?: string
}

export function RichTextViewer({ html, className }: Props) {
  if (!html) return null

  return (
    <div
      className={cn('rich-text text-sm text-slate-700 leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
