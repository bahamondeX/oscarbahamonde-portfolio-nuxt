export function useSectionMotion() {
  const active = useState('active-section', () => 'home')
  let sectionObserver: IntersectionObserver | undefined
  let revealObserver: IntersectionObserver | undefined
  let counterObserver: IntersectionObserver | undefined
  let scrollFrame = 0
  let pointerFrame = 0
  let hero: HTMLElement | null = null
  const counterFrames = new Set<number>()
  let reduced = true
  const animateCount = (el: HTMLElement) => {
    const target = Number(el.dataset.counter)
    if (!Number.isFinite(target) || reduced) return
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / 1000, 1)
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) { const id = requestAnimationFrame(step); counterFrames.add(id) }
    }
    const id = requestAnimationFrame(step); counterFrames.add(id)
  }
  const scroll = () => {
    if (scrollFrame || reduced) return
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0
      if (hero && scrollY < innerHeight * 1.5) {
        hero.style.setProperty('--parallax', `${Math.min(scrollY * .065, 48)}px`)
        hero.style.setProperty('--atmosphere-y', `${Math.min(scrollY * .15, 90)}px`)
      }
    })
  }
  const pointer = (event: PointerEvent) => {
    if (reduced || event.pointerType !== 'mouse' || pointerFrame) return
    const target = event.target as Element | null
    const card = target?.closest<HTMLElement>('.spotlight-card')
    const button = target?.closest<HTMLElement>('.magnetic')
    if (!card && !button) return
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0
      if (card) {
        const rect = card.getBoundingClientRect()
        card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
        card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
      }
      if (button) {
        const rect = button.getBoundingClientRect()
        button.style.setProperty('--mag-x', `${(event.clientX - rect.left - rect.width / 2) * .06}px`)
        button.style.setProperty('--mag-y', `${(event.clientY - rect.top - rect.height / 2) * .1}px`)
      }
    })
  }
  const pointerOut = (event: PointerEvent) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>('.magnetic')
    if (button && !(event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) {
      button.style.setProperty('--mag-x', '0px'); button.style.setProperty('--mag-y', '0px')
    }
  }
  onMounted(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    hero = document.querySelector<HTMLElement>('.hero-stage')
    sectionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) active.value = entry.target.id
    }, { rootMargin: '-20% 0px -60% 0px' })
    document.querySelectorAll('section[data-section]').forEach(el => sectionObserver?.observe(el))
    if (!reduced) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); revealObserver?.unobserve(entry.target) } })
      }, { threshold: .06 })
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => {
        if (el.getBoundingClientRect().top > innerHeight) {
          el.classList.add('reveal-ready')
          const index = Array.from(el.parentElement?.children || []).indexOf(el)
          el.style.setProperty('--reveal-delay', `${Math.min(index, 4) * 45}ms`)
          revealObserver?.observe(el)
        }
      })
      counterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { animateCount(entry.target as HTMLElement); counterObserver?.unobserve(entry.target) }
      }), { threshold: .8 })
      document.querySelectorAll<HTMLElement>('[data-counter]').forEach(el => counterObserver?.observe(el))
      window.addEventListener('scroll', scroll, { passive: true })
      document.addEventListener('pointermove', pointer, { passive: true })
      document.addEventListener('pointerout', pointerOut, { passive: true })
    }
    const aliases: Record<string, string> = { inicio: 'home', proyectos: 'projects', 'sobre-mi': 'bio', servicios: 'services', reservar: 'contact' }
    const id = aliases[location.hash.slice(1)]
    if (id) document.getElementById(id)?.scrollIntoView()
  })
  onBeforeUnmount(() => {
    sectionObserver?.disconnect(); revealObserver?.disconnect(); counterObserver?.disconnect()
    window.removeEventListener('scroll', scroll); document.removeEventListener('pointermove', pointer); document.removeEventListener('pointerout', pointerOut)
    cancelAnimationFrame(scrollFrame); cancelAnimationFrame(pointerFrame); counterFrames.forEach(cancelAnimationFrame)
  })
}
