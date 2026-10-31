// Origen de documentos y movimientos
export const SOURCE_OPTIONS = [
  { value: '', label: 'Todos los orígenes' },
  { value: 'POS', label: 'Punto de Venta' },
  { value: 'BILLING', label: 'Facturación' },
  { value: 'MANUAL', label: 'Manual' },
]

export const getSourceLabel = (source) => {
  const map = {
    POS: 'Punto de Venta',
    BILLING: 'Facturación',
    MANUAL: 'Manual',
  }
  return map[source] || source || '—'
}

export const getSourceBadge = (source) => {
  const map = {
    POS: 'badge-info',
    BILLING: 'badge-success',
    MANUAL: 'badge-neutral',
  }
  return map[source] || 'badge-neutral'
}

export const getSourceIcon = (source) => {
  const map = {
    POS: 'mdi-store',
    BILLING: 'mdi-file-document-outline',
    MANUAL: 'mdi-account-edit',
  }
  return map[source] || 'mdi-help-circle-outline'
}