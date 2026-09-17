import { useEffect, useRef } from 'react'
import { CATEGORIES, MAX_FEED_ENTRIES, OPERATOR_BADGE_TEXT, OPERATOR_FILL } from './constants'
import type { MapFilter, Signal } from './types'

const TRANSITION = 'transform 900ms cubic-bezier(0.16, 1, 0.3, 1), opacity 700ms ease'

interface FeedEntry {
  id: string
  el: HTMLDivElement
  height: number
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function makeFeedElement(signal: Signal): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;left:0;right:0;border-top:1px solid #DCE3E8;padding-top:5px;padding-bottom:5px;'
  const badgeColor = OPERATOR_FILL[signal.operateur]
  const badgeText = OPERATOR_BADGE_TEXT[signal.operateur]
  const label = CATEGORIES[signal.catKey].label
  const commentHtml = signal.comment
    ? `<p style="font-size:12px;margin:2px 0 0;color:#1A2530;line-height:1.3;">${escapeHtml(signal.comment)}</p>`
    : `<p style="font-size:12px;margin:2px 0 0;color:#5F5E5A;font-style:italic;line-height:1.3;">Aucun commentaire ajouté.</p>`
  el.innerHTML =
    `<span style="font-size:11px;padding:1px 7px;border-radius:5px;font-weight:600;background:${badgeColor};color:${badgeText};">${signal.operateur}</span>` +
    `<span style="font-size:12px;color:#1A2530;margin-left:6px;font-weight:500;">${escapeHtml(label)}</span>` +
    `<span style="font-size:10px;color:#898781;margin-left:5px;display:block;">${escapeHtml(signal.locationText)}</span>` +
    commentHtml
  return el
}

interface LiveFeedProps {
  signals: Signal[]
  filter: MapFilter | null
}

export default function LiveFeed({ signals, filter }: LiveFeedProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const entriesRef = useRef<FeedEntry[]>([])
  const knownIdsRef = useRef<Set<string>>(new Set())
  const emptyElRef = useRef<HTMLParagraphElement | null>(null)

  function matchesFilter(signal: Signal): boolean {
    if (!filter) return true
    return filter.level === 'region' ? signal.regionName === filter.name : signal.departmentName === filter.name
  }

  function measureHeight(el: HTMLElement): number {
    const container = innerRef.current
    if (!container) return 0
    el.style.visibility = 'hidden'
    el.style.transition = 'none'
    el.style.transform = 'translateY(0)'
    container.appendChild(el)
    const height = el.getBoundingClientRect().height
    container.removeChild(el)
    el.style.visibility = ''
    return height
  }

  function layout(animate: boolean) {
    const container = innerRef.current
    if (!container) return
    let y = 0
    for (const entry of entriesRef.current) {
      if (animate) {
        entry.el.style.transform = `translateY(${y}px)`
      } else {
        entry.el.style.transition = 'none'
        entry.el.style.transform = `translateY(${y}px)`
        void entry.el.offsetHeight
        entry.el.style.transition = TRANSITION
      }
      y += entry.height
    }
    container.style.height = `${y}px`
  }

  function clearAll() {
    const container = innerRef.current
    if (!container) return
    for (const entry of entriesRef.current) container.removeChild(entry.el)
    entriesRef.current = []
    if (emptyElRef.current) {
      container.removeChild(emptyElRef.current)
      emptyElRef.current = null
    }
    container.style.height = '0px'
  }

  function showEmptyState() {
    const container = innerRef.current
    if (!container) return
    const p = document.createElement('p')
    p.textContent = 'Aucun signalement pour cette zone pour le moment.'
    p.style.cssText = 'font-size:12px;color:#5F5E5A;font-style:italic;padding:14px 0;text-align:center;'
    container.appendChild(p)
    container.style.height = 'auto'
    emptyElRef.current = p
  }

  function renderFromScratch() {
    clearAll()
    const matching = signals.filter(matchesFilter)
    knownIdsRef.current = new Set(matching.map((s) => s.id))

    if (matching.length === 0) {
      showEmptyState()
      return
    }

    const toShow = matching.slice(Math.max(0, matching.length - MAX_FEED_ENTRIES))
    for (let i = toShow.length - 1; i >= 0; i -= 1) {
      const el = makeFeedElement(toShow[i])
      const height = measureHeight(el)
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
      innerRef.current?.appendChild(el)
      entriesRef.current.push({ id: toShow[i].id, el, height })
    }
    entriesRef.current.reverse()
    layout(false)
  }

  function addAnimated(signal: Signal) {
    const container = innerRef.current
    if (!container) return
    if (emptyElRef.current) {
      container.removeChild(emptyElRef.current)
      emptyElRef.current = null
    }
    const el = makeFeedElement(signal)
    const height = measureHeight(el)
    el.style.opacity = '0'
    el.style.transform = 'translateY(-10px)'
    container.appendChild(el)
    entriesRef.current.unshift({ id: signal.id, el, height })
    layout(false)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1'
        layout(true)
      })
    })

    while (entriesRef.current.length > MAX_FEED_ENTRIES) {
      const removed = entriesRef.current.pop()
      if (removed) container.removeChild(removed.el)
    }
  }

  // Rebuild instantané (sans animation) quand le filtre change.
  useEffect(() => {
    renderFromScratch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  // Insertion animée pour chaque nouveau signal correspondant au filtre actif.
  useEffect(() => {
    for (const signal of signals) {
      if (knownIdsRef.current.has(signal.id)) continue
      knownIdsRef.current.add(signal.id)
      if (matchesFilter(signal)) addAnimated(signal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals])

  return (
    <div className="flex h-full flex-col rounded-[10px] border bg-white p-2" style={{ borderColor: '#DCE3E8' }}>
      <p className="m-0 mb-1 flex-none text-[11px]" style={{ color: '#898781' }}>
        Signalements en direct
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div ref={innerRef} style={{ position: 'relative' }} />
      </div>
    </div>
  )
}
