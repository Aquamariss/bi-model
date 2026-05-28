'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { GitBranch, FolderOpen, Settings, LogOut, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/projects', label: 'Projets', icon: FolderOpen },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col w-64 min-h-screen bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-slate-800 text-sm">BIModel</span>
          <p className="text-xs text-slate-400">Modélisation IA</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-violet-600' : 'text-slate-400')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* New project shortcut */}
      <div className="px-3 pb-3">
        <Link
          href="/projects/new"
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau projet
        </Link>
      </div>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-violet-50 text-violet-700 font-medium'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          )}
        >
          <Settings className={cn('w-4 h-4', pathname.startsWith('/settings') ? 'text-violet-600' : '')} />
          Paramètres
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}
