import Link from 'next/link'
import { Plus, FolderOpen, FileText, CheckSquare, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      artifact_count:artifacts(count),
      task_count:tasks(count)
    `)
    .order('updated_at', { ascending: false })

  const list = (projects ?? []).map((p) => ({
    ...p,
    artifact_count: (p.artifact_count as unknown as { count: number }[])[0]?.count ?? 0,
    task_count: (p.task_count as unknown as { count: number }[])[0]?.count ?? 0,
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes projets</h1>
          <p className="text-slate-500 text-sm mt-1">{list.length} projet{list.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Nouveau projet
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                  <FolderOpen className="w-5 h-5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-800 text-sm truncate group-hover:text-violet-700 transition-colors">
                    {project.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modifié le {formatDate(project.updated_at)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                {project.description || <span className="italic text-slate-300">Aucune description</span>}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {project.artifact_count} artifact{project.artifact_count !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  {project.task_count} tâche{project.task_count !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5 ml-auto">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(project.created_at)}
                </span>
              </div>
            </div>
          </Link>
        ))}

        <Link href="/projects/new">
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5 hover:border-violet-400 hover:bg-violet-50/30 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px] text-slate-400 hover:text-violet-500 group">
            <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-300 group-hover:border-violet-400 flex items-center justify-center mb-3 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Créer un projet</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
