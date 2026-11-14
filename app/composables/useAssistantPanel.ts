/** Shared across route navigation; the panel is mounted once in app.vue. */
export function useAssistantPanel() {
  const isOpen = useState('assistant-open', () => false)
  const context = useState('assistant-context', () => '')
  const contextVersion = useState('assistant-context-version', () => 0)
  function open(serviceContext = '') {
    if (serviceContext) { context.value = serviceContext; contextVersion.value++ }
    isOpen.value = true
  }
  function close() { isOpen.value = false }
  return { isOpen, context, contextVersion, open, close }
}
