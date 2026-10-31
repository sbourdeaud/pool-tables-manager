import * as React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import GithubSlugger from 'github-slugger'
import { BookOpen, ChevronDown, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useI18n } from '@/lib/i18n'

interface TocItem {
  depth: number
  text: string
  id: string
}

interface TocSection {
  title: string
  id: string
  children: TocItem[]
}

const components: Components = {
  h1: (props) => <h1 className="mt-8 scroll-mt-20 text-2xl font-bold tracking-tight" {...props} />,
  h2: (props) => (
    <h2 className="mt-8 scroll-mt-20 border-b pb-1 text-xl font-bold tracking-tight" {...props} />
  ),
  h3: (props) => <h3 className="mt-6 scroll-mt-20 text-base font-bold" {...props} />,
  h4: (props) => <h4 className="mt-5 scroll-mt-20 text-sm font-bold" {...props} />,
  p: (props) => <p className="my-3 text-sm leading-6 text-foreground/90" {...props} />,
  ul: (props) => <ul className="my-3 list-disc space-y-1 pl-6 text-sm leading-6" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal space-y-1 pl-6 text-sm leading-6" {...props} />,
  li: (props) => <li className="pl-1" {...props} />,
  a: (props) => (
    <a className="font-medium text-primary underline underline-offset-4 hover:opacity-80" target={props.href && props.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" {...props} />
  ),
  code: (props) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]" {...props} />
  ),
  pre: (props) => (
    <pre className="my-3 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-xs leading-5" {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="my-3 border-l-4 border-primary/40 bg-muted/30 py-1 pl-4 text-sm text-muted-foreground" {...props} />
  ),
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border bg-muted/50 px-2 py-1.5 text-left font-semibold" {...props} />,
  td: (props) => <td className="border px-2 py-1.5 align-top" {...props} />,
  hr: () => <hr className="my-6 border-border" />,
  img: (props) => <img className="my-4 max-w-full rounded-lg border" {...props} />,
}

function buildToc(markdown: string): TocSection[] {
  const slugger = new GithubSlugger()
  const sections: TocSection[] = []
  let current: TocSection | null = null
  for (const line of markdown.split('\n')) {
    const match = line.match(/^(##|###)\s+(.+)$/)
    if (!match) continue
    const text = match[2].replace(/[*`]/g, '').trim()
    const depth = match[1].length
    const item = { depth, text, id: slugger.slug(text) }
    if (depth === 2) {
      // The English source carries its own in-document table of contents with
      // English anchor links; the localized sidebar replaces it.
      if (item.id === 'table-of-contents') continue
      current = { title: item.text, id: item.id, children: [] }
      sections.push(current)
    } else if (current) {
      current.children.push(item)
    }
  }
  return sections
}

export function HelpPage() {
  const { t, language } = useI18n()
  const [markdown, setMarkdown] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (language !== 'en') {
          const localized = await fetch(`/help/user-guide.${language}.md`)
          if (localized.ok) {
            const text = await localized.text()
            if (active) {
              setMarkdown(text)
              setError(null)
            }
            return
          }
        }
        const response = await fetch('/help/user-guide.md')
        if (!response.ok) throw new Error(String(response.status))
        const text = await response.text()
        if (active) {
          setMarkdown(text)
          setError(null)
        }
      } catch {
        if (active) setError(t('The user guide could not be loaded.'))
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [language, t])

  const toc = React.useMemo(() => buildToc(markdown), [markdown])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BookOpen className="h-6 w-6" /> {t('Help')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('How to use Pool Tables Manager — the same guide is published in the repository wiki.')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/api-docs" target="_blank" rel="noopener noreferrer">
              <ExternalLink /> {t('API reference')}
            </a>
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !markdown ? (
        <p className="text-sm text-muted-foreground">{t('Loading the guide…')}</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('Contents')}</p>
            <nav className="space-y-0.5 text-sm">
              {toc.map((section) => (
                <Collapsible key={section.id} defaultOpen>
                  <div className="flex items-center justify-between gap-1 rounded-md px-2 py-1 hover:bg-muted/50">
                    <a
                      href={`#${section.id}`}
                      className="min-w-0 flex-1 truncate font-medium text-foreground/80 hover:text-foreground"
                    >
                      {section.title}
                    </a>
                    <CollapsibleTrigger className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label={section.title}>
                      <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="ml-3 space-y-0.5 border-l pl-2">
                      {section.children.map((child) => (
                        <a
                          key={child.id}
                          href={`#${child.id}`}
                          className="block truncate py-0.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {child.text}
                        </a>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </nav>
          </aside>
          <article className="min-w-0 max-w-3xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
              {markdown}
            </ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  )
}
