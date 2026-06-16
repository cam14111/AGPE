// Export CSV client-side (aucun appel serveur).
// Séparateur ';' + BOM UTF-8 pour compatibilité Excel FR (CODING_GUIDELINES §10).

export interface SignupExportRow {
  email: string
  firstName: string
  lastName: string
  standName: string
  // Jour du créneau (date française lisible).
  day: string
  startTime: string
  endTime: string
  createdAt: string
}

// BOM UTF-8 (U+FEFF) en tête de fichier — évite les problèmes d'accents dans Excel.
const BOM = String.fromCharCode(0xfeff)

// Échappe une valeur CSV : guillemets doublés si elle contient ; " ou un saut de ligne.
function escapeCsv(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateCsv(rows: SignupExportRow[]): string {
  const header = 'Email;Prénom;Nom;Stand;Jour;Créneau;Date inscription'
  const lines = rows.map((r) =>
    [
      r.email,
      r.firstName,
      r.lastName,
      r.standName,
      r.day,
      `${r.startTime} → ${r.endTime}`,
      r.createdAt,
    ]
      .map(escapeCsv)
      .join(';'),
  )
  return BOM + [header, ...lines].join('\n')
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Nom de fichier normalisé : kermesse_inscrits_YYYY-MM-DD.csv
export function buildCsvFilename(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10)
  return `kermesse_inscrits_${iso}.csv`
}
