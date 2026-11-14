export function useLocaleTag() {
  const { locale, localeProperties } = useI18n()
  return computed(() => localeProperties.value.language || locale.value)
}
