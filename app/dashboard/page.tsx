'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, Search, Download, Filter, Calendar } from 'lucide-react'

import { PagoFormaPro } from '@/src/types/dashboard'
import KpiCards from '@/src/components/dashboard/KpiCards'
import DashboardCharts from '@/src/components/dashboard/DashboardsCharts'
import PaymentsTable from '@/src/components/dashboard/PaymentsTable'

export default function Dashboard() {
  const [pagos, setPagos] = useState<PagoFormaPro[]>([])
  const [cargando, setCargando] = useState<boolean>(true)
  
  const [busqueda, setBusqueda] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [fechaInicio, setFechaInicio] = useState<string>('')
  const [fechaFin, setFechaFin] = useState<string>('')
  const [filtroMoneda, setFiltroMoneda] = useState<string>('Todas')
  const [monedasDisponibles, setMonedasDisponibles] = useState<string[]>([])
  
  const [paginaActual, setPaginaActual] = useState<number>(1)
  const pagosPorPagina = 6

  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      const supabase = createClient()
      const { data } = await supabase
        .from('pagos_formapro')
        .select('*')
        .order('fecha', { ascending: false })

      if (data) {
        const pagosData = data as PagoFormaPro[];
        setPagos(pagosData)
        const monedas = Array.from(new Set(pagosData.map(p => (p.moneda || 'COP').toUpperCase())))
        setMonedasDisponibles(monedas)
      }
      setCargando(false)
    }
    cargarDatos()
  }, [])

  const cerrarSesion = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (cargando) return <DashboardSkeleton />

  const pagosFiltrados = pagos.filter(p => {
    const termino = busqueda.toLowerCase()
    const coincideBusqueda = (p.nombre?.toLowerCase().includes(termino)) ||
                             (p.email?.toLowerCase().includes(termino)) ||
                             (p.id_pago.toLowerCase().includes(termino))
    
    const coincideEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    
    const fechaPago = p.fecha.split('T')[0]
    const coincideFechaInicio = !fechaInicio || fechaPago >= fechaInicio
    const coincideFechaFin = !fechaFin || fechaPago <= fechaFin

    const coincideMoneda = filtroMoneda === 'Todas' || (p.moneda?.toUpperCase() || 'COP') === filtroMoneda

    return coincideBusqueda && coincideEstado && coincideFechaInicio && coincideFechaFin && coincideMoneda
  })

  const indiceUltimoPago = paginaActual * pagosPorPagina
  const indicePrimerPago = indiceUltimoPago - pagosPorPagina
  const pagosPaginados = pagosFiltrados.slice(indicePrimerPago, indiceUltimoPago)
  const totalPaginas = Math.max(1, Math.ceil(pagosFiltrados.length / pagosPorPagina))

  const exportarCSV = () => {
    const cabeceras = ['ID Pago', 'Cliente', 'Email', 'Curso', 'Importe Original', 'Moneda', 'Tasa Cambio', 'Equivalente COP', 'Estado', 'Fecha']
    const filas = pagosFiltrados.map(p => [
      p.id_pago, p.nombre || 'N/A', p.email || 'N/A', p.curso || 'N/A',
      p.importe, (p.moneda || 'COP').toUpperCase(), p.tasa_cambio || 1, p.importe * (p.tasa_cambio || 1),
      p.estado, new Date(p.fecha).toLocaleDateString()
    ])
    const contenidoCSV = [cabeceras.join(','), ...filas.map(fila => fila.join(','))].join('\n')
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `reporte_pagos_${fechaInicio || 'inicio'}_a_${fechaFin || 'fin'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans relative overflow-hidden selection:bg-blue-900 selection:text-white">
      
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
        <h1 className="text-[20vw] font-black text-white tracking-tighter">LOGALI</h1>
      </div>

      <div className="relative z-10">
        <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <span className="text-white font-bold text-lg leading-none">L</span>
            </div>
            <h1 className="text-xl font-bold text-gray-100 tracking-tight">Logali <span className="font-light text-gray-400">Analytics</span></h1>
          </div>
          <button onClick={cerrarSesion} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors font-medium">
            <LogOut size={16} /> Salir
          </button>
        </header>

        <main className="p-8 max-w-7xl mx-auto space-y-8">
          
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" placeholder="Buscar ID, cliente o email..." value={busqueda} 
                  onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm outline-none bg-gray-950 text-gray-200 placeholder-gray-500 transition-all"
                />
              </div>

              <div className="flex items-center border border-gray-700 rounded-lg px-3 py-1.5 bg-gray-950 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <Calendar size={16} className="text-gray-500 mr-2" />
                <input type="date" value={fechaInicio} 
                  onChange={(e) => { setFechaInicio(e.target.value); setPaginaActual(1); }} 
                  className="text-sm outline-none bg-transparent text-gray-300 color-scheme-dark" 
                />
                <span className="text-gray-500 mx-2 text-sm">hasta</span>
                <input type="date" value={fechaFin} 
                  onChange={(e) => { setFechaFin(e.target.value); setPaginaActual(1); }} 
                  className="text-sm outline-none bg-transparent text-gray-300 color-scheme-dark" 
                />
              </div>

              <select 
                value={filtroMoneda} 
                onChange={(e) => { setFiltroMoneda(e.target.value); setPaginaActual(1); }}
                className="border border-gray-700 rounded-lg px-4 py-2 text-sm outline-none bg-gray-950 text-gray-300 focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="Todas">🌍 Todas las Monedas</option>
                {monedasDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center border-t border-gray-800 pt-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                <Filter size={16} className="text-gray-500 ml-1 mr-2" />
                {['todos', 'completed', 'refunded'].map(estado => (
                  <button
                    key={estado}
                    onClick={() => { setFiltroEstado(estado); setPaginaActual(1); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                      filtroEstado === estado 
                        ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {estado}
                  </button>
                ))}
              </div>
              <button onClick={exportarCSV} className="flex items-center gap-2 bg-gray-100 hover:bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                <Download size={16} /> <span className="hidden sm:inline">Exportar Datos</span>
              </button>
            </div>
          </div>

          <KpiCards pagosFiltrados={pagosFiltrados} />
          <DashboardCharts pagosFiltrados={pagosFiltrados} />
          
          <PaymentsTable 
            pagosPaginados={pagosPaginados}
            totalFiltrados={pagosFiltrados.length}
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            setPaginaActual={setPaginaActual}
            indicePrimerPago={indicePrimerPago}
            indiceUltimoPago={indiceUltimoPago}
          />

        </main>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-950 p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="h-8 bg-gray-900 border border-gray-800 rounded w-48 mb-8"></div>
      <div className="h-20 bg-gray-900 border border-gray-800 rounded-xl mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-xl"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-gray-900 border border-gray-800 rounded-xl"></div>
        <div className="h-80 bg-gray-900 border border-gray-800 rounded-xl"></div>
        <div className="h-80 bg-gray-900 border border-gray-800 rounded-xl lg:col-span-2"></div>
      </div>
      <div className="h-96 bg-gray-900 border border-gray-800 rounded-xl"></div>
    </div>
  )
}