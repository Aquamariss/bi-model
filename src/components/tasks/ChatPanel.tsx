'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TaskMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  messages: TaskMessage[]
  onSend: (content: string) => void
  isLoading?: boolean
}

export function ChatPanel({ messages, onSend, isLoading }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <span className="text-sm font-medium text-slate-700">Assistant IA</span>
        {isLoading && (
          <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Génération en cours...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2.5 text-sm',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5',
              msg.role === 'user' ? 'bg-teal-100' : 'bg-violet-100'
            )}>
              {msg.role === 'user'
                ? <User className="w-3.5 h-3.5 text-teal-600" />
                : <Bot className="w-3.5 h-3.5 text-violet-600" />
              }
            </div>
            <div className={cn(
              'max-w-[85%] rounded-xl px-3 py-2.5 leading-relaxed',
              msg.role === 'user'
                ? 'bg-teal-50 text-slate-800 rounded-tr-sm'
                : 'bg-slate-50 text-slate-800 rounded-tl-sm'
            )}>
              <p>{msg.content}</p>
              <p className="text-xs text-slate-400 mt-1">{formatTime(msg.created_at)}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div className="bg-slate-50 rounded-xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Demandez une correction ou un ajustement… (Entrée pour envoyer)"
            className="resize-none border-slate-200 text-sm min-h-[60px] max-h-[120px]"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-violet-600 hover:bg-violet-700 text-white h-10 w-10 p-0 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
