export function useSectionMotion() {
  const active = useState('active-section', () => 'home')
  let sectionObserver: IntersectionObserver | undefined
  let revealObserver: IntersectionObserver | undefined
  let raf = 0
  const scroll = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('.hero-portrait')
      if (el && scrollY < innerHeight) el.style.setProperty('--parallax', `${Math.min(scrollY * .08, 50)}px`)
    })
  }
  onMounted(() => {
    sectionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) active.value = entry.target.id
    }, { rootMargin: '-20% 0px -60% 0px' })
    document.querySelectorAll('section[data-section]').forEach(el => sectionObserver?.observe(el))
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); revealObserver?.unobserve(entry.target) } })
      }, { threshold: .08 })
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => {
        // Only animate content outside the initial viewport; SSR stays visible without JS.
        if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('reveal-ready'); revealObserver?.observe(el) }
      })
      window.addEventListener('scroll', scroll, { passive: true })
    }
    const aliases: Record<string, string> = { inicio: 'home', proyectos: 'projects', 'sobre-mi': 'bio', servicios: 'services', reservar: 'contact' }
    const id = aliases[location.hash.slice(1)]
    if (id) document.getElementById(id)?.scrollIntoView()
  })
  onBeforeUnmount(() => { sectionObserver?.disconnect(); revealObserver?.disconnect(); window.removeEventListener('scroll', scroll); cancelAnimationFrame(raf) })
}
