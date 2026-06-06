import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import type { PagoFormaPro } from '@/src/types/dashboard'

export default function TestConnection() {
  // 1. Reemplazamos any[] por PagoFormaPro[]
  const [data, setData] = useState<PagoFormaPro[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('pagos_formapro').select('*').then(({ data }) => {
      // 2. Hacemos el casteo (as PagoFormaPro[]) para asegurar los tipos
      if (data) setData(data as PagoFormaPro[])
    })
  }, [])

  return (
    <pre className="p-4 bg-gray-100 rounded text-sm overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}