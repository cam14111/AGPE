import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  buildCsvFilename,
  downloadCsv,
  generateCsv,
  type SignupExportRow,
} from '@/lib/csv-export'
import { formatTime } from '@/lib/date-utils'
import type { AdminSignupDetail } from '@/hooks/useAdminSignups'

interface CsvExportButtonProps {
  details: AdminSignupDetail[]
}

// Bouton d'export CSV client-side des inscriptions.
export function CsvExportButton({ details }: CsvExportButtonProps) {
  function handleExport(): void {
    if (details.length === 0) {
      toast.info('Aucune inscription à exporter.')
      return
    }
    const rows: SignupExportRow[] = details.map((d) => ({
      email: d.email ?? '',
      firstName: d.first_name ?? '',
      lastName: d.last_name ?? '',
      standName: d.stand_name,
      startTime: formatTime(d.start_time),
      endTime: formatTime(d.end_time),
      createdAt: d.created_at,
    }))
    downloadCsv(generateCsv(rows), buildCsvFilename())
    toast.success('Export CSV téléchargé.')
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="h-4 w-4" />
      Exporter CSV
    </Button>
  )
}
