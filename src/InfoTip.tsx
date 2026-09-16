import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

/**
 * A tooltip on one control: what to enter and why it matters.
 *
 * OUT OF FLOW, deliberately. C1-NF-03 and acceptance 20 measure
 * `main.converter`, so an explanation that expanded inline would make the
 * converter taller every time it was read. The panel is positioned over the
 * form instead and costs no height.
 *
 * Opens on mouse hover, on keyboard focus, and on click, so it is reachable
 * without a mouse and on a touchscreen. A click pins it open; Escape or a
 * press anywhere else closes it. The pointer can move onto the panel without
 * it closing, so the text can be selected. The panel stays in the DOM while
 * hidden so `aria-describedby` resolves whether or not it is showing.
 *
 * No `title=` attribute: it cannot be reached from the keyboard, and it
 * cannot be read on a touchscreen at all.
 */
export function InfoTip({
  topic,
  paragraphs,
  align = 'start',
}: {
  /** Names the control, for the trigger's accessible name. */
  topic: string
  paragraphs: readonly string[]
  /** Which edge of the trigger the panel lines up with. `end` for triggers at the right of a row. */
  align?: 'start' | 'end'
}) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || focused || pinned

  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPinned(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setHovered(false)
      setFocused(false)
      setPinned(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Keep the panel inside the viewport. A trigger near the right edge on a
  // phone would otherwise open a panel that runs off the screen, and one near
  // the foot of the window a panel that runs below it; that one opens upward
  // instead, if there is room above.
  useLayoutEffect(() => {
    const el = panel.current
    if (!el) return
    el.style.transform = ''
    delete el.dataset.flip
    if (!open) return
    const margin = 8
    const box = el.getBoundingClientRect()
    const viewport = document.documentElement.clientWidth
    let dx = 0
    if (box.right > viewport - margin) dx = viewport - margin - box.right
    if (box.left + dx < margin) dx = margin - box.left
    if (dx !== 0) el.style.transform = `translateX(${dx}px)`
    const trigger = ref.current?.getBoundingClientRect()
    if (trigger && box.bottom > window.innerHeight - margin && trigger.top - box.height - margin > 6) {
      el.dataset.flip = 'up'
    }
  }, [open])

  return (
    <span
      className="tip"
      ref={ref}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
    >
      <button
        type="button"
        className="tip-trigger"
        aria-label={`About ${topic}`}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => {
          // Unpinning also clears the hover, or a click meant to close the
          // panel would leave it showing until the pointer moved away.
          if (pinned) setHovered(false)
          setPinned(!pinned)
        }}
        // Keyboard focus only. A mouse click also focuses the button in most
        // browsers, and opening on that focus would stop a second click from
        // closing the panel.
        onFocus={(e) => setFocused(e.currentTarget.matches(':focus-visible'))}
        onBlur={() => setFocused(false)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="7" cy="7" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="7" cy="4.1" r="0.85" fill="currentColor" />
          <path d="M7 6.2 V10.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
      <span
        id={id}
        ref={panel}
        role="tooltip"
        className={`tip-panel tip-${align}`}
        hidden={!open}
      >
        {paragraphs.map((p) => (
          <span key={p} className="tip-p">{p}</span>
        ))}
      </span>
    </span>
  )
}
