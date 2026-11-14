<script setup lang="ts">
const projects = [
  { name: 'VOZ', category: 'VOICE AI · PRODUCT', text: 'Agentes de voz para conectar negocios y personas. Plataforma en desarrollo con IA conversacional e integraciones empresariales.', href: 'https://voz.oscarbahamonde.com', symbol: '◉' },
  { name: 'Quipubase', category: 'DATA · OPEN SOURCE', text: 'Una API para explorar IA, embeddings, búsqueda vectorial, colecciones en tiempo real y almacenamiento.', href: 'https://github.com/bahamondeX/quipubase', symbol: '⌘' },
  { name: 'aiofauna', category: 'PYTHON · BACKEND', text: 'Un framework de backend para construir aplicaciones Python y explorar arquitecturas serverless.', href: 'https://github.com/obahamonde/aiofauna', symbol: '↗' }
]
const services = [
  { title: 'Sesión 1:1', price: 'S/20', detail: '30 minutos', text: 'Resuelve una duda sobre arquitectura, IA, datos o tu carrera técnica.', href: '#reservar', icon: '↗' },
  { title: 'AI & Automation', price: 'S/900', detail: 'desde', text: 'Un flujo inteligente, un prototipo útil y una integración con propósito.', href: 'mailto:oscar.bahamonde.dev@gmail.com?subject=Proyecto%20de%20IA', icon: '✦' },
  { title: 'Data Engineering', price: 'S/1,800', detail: 'desde', text: 'Pipelines confiables, modelos de datos e integraciones que escalan.', href: 'mailto:oscar.bahamonde.dev@gmail.com?subject=Proyecto%20de%20datos', icon: '▥' },
  { title: 'Cloud & SRE Audit', price: 'S/1,200', detail: 'desde', text: 'Diagnóstico de infraestructura, costos, CI/CD y confiabilidad.', href: 'mailto:oscar.bahamonde.dev@gmail.com?subject=Auditoria%20cloud', icon: '◎' }
]
const skills = ['Python / FastAPI', 'Agentic AI & RAG', 'AWS', 'Kubernetes', 'Terraform', 'PostgreSQL', 'Observability', 'Data Platforms']
const experience = [
  { role: 'Site Reliability Engineer', company: 'Dynata', text: 'Infraestructura Kubernetes en AWS, automatización de despliegues y observabilidad de sistemas en producción.' },
  { role: 'Senior Data Engineer', company: 'Globant', text: 'Plataformas de datos e IA aplicada, pipelines en AWS y soluciones para equipos empresariales.' },
  { role: 'Backend Engineer', company: 'Pronti AI', text: 'Migración de Flask a FastAPI e integración de Milvus, RabbitMQ y Firebase para una plataforma de moda con IA.' }
]
</script>

<template>
  <a class="skip" href="#contenido">Saltar al contenido</a>
  <header class="nav-wrap"><nav aria-label="Navegación principal" class="nav shell">
    <a class="brand" href="#inicio" aria-label="Oscar Bahamonde — Inicio">ob<span>.</span></a>
    <div class="nav-links"><a href="#proyectos">Proyectos</a><a href="#servicios">Servicios</a><a href="#sobre-mi">Sobre mí</a></div>
    <a class="nav-cta" href="#reservar">Hablemos <span aria-hidden="true">↗</span></a>
  </nav></header>
  <main id="contenido">
    <section id="inicio" class="hero shell">
      <div class="hero-copy"><p class="eyebrow"><span class="status" /> SOFTWARE ENGINEER · AI SYSTEMS ARCHITECT</p>
        <h1>Engineering<br>the <span>intelligent</span><br>future.</h1>
        <p class="intro">Transformo ideas ambiciosas en sistemas reales. IA aplicada, plataformas de datos y arquitectura cloud que escalan con propósito.</p>
        <div class="actions"><a class="button primary" href="#proyectos">Explorar mi trabajo <span aria-hidden="true">↗</span></a><a class="text-link" href="#reservar">Trabajemos juntos <span aria-hidden="true">→</span></a></div>
        <div class="social"><a href="https://github.com/bahamondeX">GitHub ↗</a><a href="https://linkedin.com/in/obahamondem/">LinkedIn ↗</a><a href="mailto:oscar.bahamonde.dev@gmail.com">Email ↗</a></div>
      </div>
      <div class="art" aria-hidden="true"><div class="orb"/><div class="orbit one"/><div class="orbit two"/><div class="art-label">IDEAS → SYSTEMS → IMPACT</div></div>
      <div class="hero-bottom"><span>BASED IN PERU. BUILDING GLOBALLY.</span><a href="#proyectos" aria-label="Desplazarse a proyectos">SCROLL TO EXPLORE ↓</a></div>
    </section>
    <div class="trust"><div class="shell"><span>EXPERIENCIA EN</span><strong>GLOBANT</strong><strong>DYNATA</strong><strong>PRONTI AI</strong><strong>HUAWEI</strong><strong>TELEFÓNICA</strong></div></div>
    <section id="proyectos" class="section shell"><p class="eyebrow">01 / SELECTED WORK</p><div class="section-heading"><h2>Built to make<br><span>an impact.</span></h2><p>Productos propios y sistemas diseñados para resolver problemas complejos de forma simple.</p></div>
      <div class="projects"><a v-for="project in projects" :key="project.name" class="project" :href="project.href"><div class="project-art" aria-hidden="true">{{ project.symbol }}</div><p class="eyebrow">{{ project.category }}</p><h3>{{ project.name }} <span aria-hidden="true">↗</span></h3><p>{{ project.text }}</p></a></div>
    </section>
    <section id="sobre-mi" class="section shell about"><div><p class="eyebrow">02 / THE ENGINEER</p><h2>Beautiful ideas.<br><span>Reliable systems.</span></h2><p class="body-copy">Soy Oscar. Ingeniero de software, datos e inteligencia artificial. Me muevo entre la profundidad técnica y la visión de producto: del primer prototipo a la infraestructura que lo sostiene.</p><p class="body-copy">He trabajado con equipos globales en backend, datos y confiabilidad. Hoy ayudo a convertir necesidades de negocio en tecnología útil y mantenible.</p><a class="text-link" href="https://linkedin.com/in/obahamondem/">Mi trayectoria en LinkedIn ↗</a></div><div class="identity"><img class="portrait" src="/images/oscar-portrait.jpg" alt="Retrato de Oscar Bahamonde" width="1254" height="1254" loading="lazy" decoding="async"><p>OSCAR BAHAMONDE</p><span>Perú · Global mindset</span><div class="skills"><span v-for="skill in skills" :key="skill">{{ skill }}</span></div></div></section>
    <section id="servicios" class="section shell"><p class="eyebrow">03 / WORK WITH ME</p><h2>Let's build something<br><span>exceptional.</span></h2><div class="services"><article v-for="service in services" :key="service.title" class="service"><span class="service-icon" aria-hidden="true">{{ service.icon }}</span><h3>{{ service.title }}</h3><p>{{ service.text }}</p><div class="price">{{ service.price }} <small>{{ service.detail }}</small></div><a :href="service.href" class="button">{{ service.title === 'Sesión 1:1' ? 'Elegir horario' : 'Solicitar propuesta' }} <span aria-hidden="true">↗</span></a></article></div><p class="fineprint">Precios introductorios en soles peruanos. Los proyectos se cotizan según alcance, entregables y plazos.</p></section>
    <section class="section shell"><p class="eyebrow">04 / TRACK RECORD</p><h2>Real work.<br><span>Measurable impact.</span></h2><div class="experience"><article v-for="item in experience" :key="item.company"><h3>{{ item.company }}</h3><div><h4>{{ item.role }}</h4><p>{{ item.text }}</p></div><span aria-hidden="true">↗</span></article></div></section>
    <section id="reservar" class="section shell booking"><div><p class="eyebrow">05 / LET'S TALK</p><h2>Your next<br>breakthrough<br><span>starts here.</span></h2><p class="body-copy">Una conversación concreta para desbloquear tu próximo paso.</p><a class="text-link" href="mailto:oscar.bahamonde.dev@gmail.com">¿Prefieres escribir? Email ↗</a></div><article class="booking-card"><p class="eyebrow">CONSULTORÍA PERSONALIZADA</p><h3>Sesión 1:1</h3><p class="booking-price">S/20<span>/ 30 minutos</span></p><ul><li>Videollamada por Google Meet</li><li>Lunes a viernes · horario de Lima</li><li>9:00–13:00 y 14:00–17:00</li><li>Disponibilidad según tu agenda real</li></ul><BookingFlow /></article></section>

  </main>
  <footer class="shell"><a class="brand" href="#inicio">oscar<span>.</span>bahamonde</a><p>Building intelligent systems that matter.</p><div><small>© {{ new Date().getFullYear() }} Oscar Bahamonde · Perú</small><a href="#inicio">Volver arriba ↑</a></div></footer>
</template>
