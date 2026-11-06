const { builtAt, commit, status } = __FRONTEND_BUILD__

export function BuildIdentifier() {
  return (
    <div role="group" aria-label="Frontend build" className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
      <span>
        Build <time dateTime={builtAt}>{builtAt.replace('T', ' ').replace('Z', ' UTC')}</time>
      </span>
      <span title={commit ? `Commit ${commit}` : undefined}>
        <span aria-hidden={Boolean(commit)}>{commit ? commit.slice(0, 12) : 'commit unknown'}</span>
        {commit && <span className="sr-only">Commit {commit}</span>}
      </span>
      <span>({status === 'unknown' ? 'status unknown' : status})</span>
    </div>
  )
}
