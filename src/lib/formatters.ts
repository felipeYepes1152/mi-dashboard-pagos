export const formatearMoneda = (cantidad: number, moneda: string = 'COP'): string => {
  const locales: Record<string, string> = { COP: 'es-CO', USD: 'en-US', EUR: 'es-ES', MXN: 'es-MX' }
  const locale = locales[moneda.toUpperCase()] || 'es-CO'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moneda.toUpperCase(),
    minimumFractionDigits: moneda.toUpperCase() === 'COP' ? 0 : 2,
  }).format(cantidad)
}