import * as React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import GithubSlugger from 'github-slugger'
import { BookOpen, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

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

interface TocGroup {
  title: string
  sections: TocSection[]
}

const components: Components = {
  h1: (props) => <h1 className="mt-8 text-2xl font-bold tracking-tight" {...props} />,
  h2: (props) => <h2 className="mt-8 border-b pb-1 text-xl font-bold tracking-tight" {...props} />,
  h3: (props) => <h3 className="mt-6 text-base font-bold" {...props} />,
  h4: (props) => <h4 className="mt-5 text-sm font-bold" {...props} />,
  p: (props) => <p className="my-3 text-sm leading-6 text-foreground/90" {...props} />,
  ul: (props) => <ul className="my-3 list-disc space-y-1 pl-6 text-sm leading-6" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal space-y-1 pl-6 text-sm leading-6" {...props} />,
  li: (props) => <li className="pl-1" {...props} />,
  a: (props) => (
    <a className="font-medium text-primary underline underline-offset-4 hover:opacity-80" target={props.href && props.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" {...props} />
  ),
  code: (props) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]" {...props} />,
  pre: (props) => <pre className="my-3 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-xs leading-5" {...props} />,
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

function removeInDocumentContents(markdown: string): string {
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => /^##\s+Table of Contents\s*$/i.test(line))
  if (start < 0) return markdown
  let end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line))
  if (end < 0) end = lines.length
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n')
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
      current = { title: item.text, id: item.id, children: [] }
      sections.push(current)
    } else if (current) {
      current.children.push(item)
    }
  }
  return sections
}

function groupToc(toc: TocSection[], t: (key: string) => string): TocGroup[] {
  return [
    { title: t('Dashboard'), sections: toc.slice(0, 4) },
    { title: t('Session'), sections: toc.slice(4, 9) },
    { title: t('Admin'), sections: toc.slice(9, 13) },
    { title: t('Financial'), sections: toc.slice(13, 15) },
    { title: t('Help'), sections: toc.slice(15) },
  ].filter((group) => group.sections.length > 0)
}

function SectionMenuLinks({ section, activeId }: { section: TocSection; activeId: string }) {
  const sectionActive = section.id === activeId || section.children.some((child) => child.id === activeId)
  return (
    <li className="min-w-0 rounded-lg border bg-background p-3">
      <NavigationMenuLink asChild>
        <a
          href={`#${section.id}`}
          aria-current={section.id === activeId ? 'location' : undefined}
          className={cn('block truncate rounded-sm text-sm font-semibold hover:text-primary', sectionActive && 'text-primary')}
        >
          {section.title}
        </a>
      </NavigationMenuLink>
      {section.children.length > 0 && (
        <ul className="mt-2 space-y-1 border-l pl-3">
          {section.children.map((child) => (
            <li key={child.id}>
              <NavigationMenuLink asChild>
                <a
                  href={`#${child.id}`}
                  aria-current={child.id === activeId ? 'location' : undefined}
                  className={cn('block truncate rounded-sm py-0.5 text-xs text-muted-foreground hover:text-foreground', child.id === activeId && 'font-semibold text-primary')}
                >
                  {child.text}
                </a>
              </NavigationMenuLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function HelpPage() {
  const { t, language } = useI18n()
  const [markdown, setMarkdown] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [activeId, setActiveId] = React.useState('')

  React.useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (language !== 'en') {
          const localized = await fetch(`/help/user-guide.${language}.md`)
          if (localized.ok) {
            const text = await localized.text()
            if (active) {
              setMarkdown(removeInDocumentContents(text))
              setError(null)
            }
            return
          }
        }
        const response = await fetch('/help/user-guide.md')
        if (!response.ok) throw new Error(String(response.status))
        const text = await response.text()
        if (active) {
          setMarkdown(removeInDocumentContents(text))
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
  const groups = React.useMemo(() => groupToc(toc, t), [toc, t])
  const navRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const apply = () => {
      const header = document.querySelector('header')
      const headerHeight = header ? header.getBoundingClientRect().height : 56
      document.documentElement.style.scrollPaddingTop = `${Math.round(headerHeight + nav.getBoundingClientRect().height + 8)}px`
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(nav)
    return () => {
      observer.disconnect()
      document.documentElement.style.scrollPaddingTop = ''
    }
  }, [markdown, groups])

  React.useEffect(() => {
    if (toc.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-160px 0px -65% 0px', threshold: 0 },
    )
    for (const section of toc) {
      const heading = document.getElementById(section.id)
      if (heading) observer.observe(heading)
      for (const child of section.children) {
        const subheading = document.getElementById(child.id)
        if (subheading) observer.observe(subheading)
      }
    }
    return () => observer.disconnect()
  }, [toc, markdown])

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
        <>
          <div ref={navRef} className="sticky top-14 z-30 -mx-4 border-y bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-lg lg:border">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('Contents')}</p>
            <NavigationMenu>
              <NavigationMenuList>
                {groups.map((group) => {
                  const groupActive = group.sections.some(
                    (section) => section.id === activeId || section.children.some((child) => child.id === activeId),
                  )
                  return (
                    <NavigationMenuItem key={group.title}>
                      <NavigationMenuTrigger className={cn(groupActive && 'bg-accent text-accent-foreground')}>
                        {group.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid max-h-[min(65vh,34rem)] w-[min(92vw,760px)] gap-2 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-3">
                          {group.sections.map((section) => (
                            <SectionMenuLinks key={section.id} section={section} activeId={activeId} />
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <article className="mx-auto w-full max-w-4xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
              {markdown}
            </ReactMarkdown>
          </article>
        </>
      )}
    </div>
  )
}
