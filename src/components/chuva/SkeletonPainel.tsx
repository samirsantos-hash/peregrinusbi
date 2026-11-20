import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonPainel() {
  return <div role="status" aria-label="Carregando painel" className="skeleton-painel">
    <span className="sr-only">Carregando dados…</span>
    <div aria-hidden="true" className="space-y-6">
      <div className="flex items-center justify-between gap-6 border-b border-border pb-5"><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-28" /></div>
      <div className="flex flex-wrap gap-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-10 w-36" /></div>
      <div className="skeleton-painel-corpo">
        <div className="hidden lg:block space-y-4"><Skeleton className="h-6 w-32" />{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        <div className="min-w-0 space-y-5">
          <Skeleton className="h-7 w-48" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="rounded-lg border border-border p-4 space-y-4"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-7 w-4/5" /><Skeleton className="h-3 w-1/2" /></div>)}</div>
          <Skeleton className="h-64 w-full" />
          <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        </div>
      </div>
    </div>
  </div>;
}