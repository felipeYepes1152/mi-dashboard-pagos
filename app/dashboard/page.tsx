'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DollarSign, CreditCard, RefreshCcw, TrendingUp, LogOut, Search, Download, ChevronLeft, ChevronRight, Filter, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

// Actualizamos la interfaz para incluir la nueva columna de la BD
interface PagoFormaPro {
  id_pago: string
  email: string
  nombre: string
  curso: string
  importe: number
  moneda: string
  estado: string
  fecha: string
  tasa_cambio?: number // Nueva propiedad inyectada por n8n
}

const formatearMoneda = (cantidad: number, moneda: string = 'COP') => {
  const locales: Record<string, string> = { COP: 'es-CO', USD: 'en-US', EUR: 'es-ES', MXN: 'es-MX' }
  const locale = locales[moneda.toUpperCase()] || 'es-CO'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moneda.toUpperCase(),
    minimumFractionDigits: moneda.toUpperCase() === 'COP' ? 0 : 2,
  }).format(cantidad)
}

export default function Dashboard() {
  const [pagos, setPagos] = useState<PagoFormaPro[]>([])
  const [cargando, setCargando] = useState(true)
  
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [filtroMoneda, setFiltroMoneda] = useState<string>('Todas')
  const [monedasDisponibles, setMonedasDisponibles] = useState<string[]>([])
  
  const [paginaActual, setPaginaActual] = useState(1)
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
        setPagos(data as PagoFormaPro[])
        const monedas = Array.from(new Set((data as PagoFormaPro[]).map(p => p.moneda?.toUpperCase() || 'COP')))
        setMonedasDisponibles(monedas)
      }
      setCargando(false)
    }
    cargarDatos()
  }, [])

  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, filtroEstado, fechaInicio, fechaFin, filtroMoneda])

  const cerrarSesion = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (cargando) return <DashboardSkeleton />

  // --- MOTOR DE FILTRADO ---
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

  // --- KPIs DE NEGOCIO (Normalizados a COP usando tasa_cambio) ---
  const pagosCompletados = pagosFiltrados.filter(p => p.estado === 'completed')
  
  const ingresosTotalesCOP = pagosCompletados.reduce((acc, pago) => {
    const tasa = pago.tasa_cambio || 1
    return acc + (pago.importe * tasa)
  }, 0)

  const ticketMedioCOP = pagosCompletados.length > 0 
    ? ingresosTotalesCOP / pagosCompletados.length 
    : 0

  // --- GRÁFICOS REACTIVOS (Normalizados a COP) ---
  const COLORES = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

  const statsPorCurso = pagosFiltrados.reduce((acc: any, pago) => {
    const curso = pago.curso || 'Otros'
    if (!acc[curso]) acc[curso] = { nombre: curso, total: 0, exito: 0, riesgo: 0 }
    acc[curso].total += 1
    pago.estado === 'completed' ? acc[curso].exito += 1 : acc[curso].riesgo += 1 
    return acc
  }, {})

  const datosRiesgo = Object.values(statsPorCurso).map((c: any) => ({
    name: c.nombre,
    'Tasa de Éxito (%)': Number(((c.exito / c.total) * 100).toFixed(1)),
    'Probabilidad de Riesgo (%)': Number(((c.riesgo / c.total) * 100).toFixed(1))
  }))

  const ventasPorCurso = pagosCompletados.reduce((acc: any, pago) => {
    const curso = pago.curso || 'Otros'
    const valorConvertido = pago.importe * (pago.tasa_cambio || 1)
    if (!acc[curso]) acc[curso] = { totalCOP: 0 }
    acc[curso].totalCOP += valorConvertido
    return acc
  }, {})

  const datosIngresos = Object.keys(ventasPorCurso).map(curso => ({
    name: curso,
    value: ventasPorCurso[curso].totalCOP,
  })).sort((a, b) => b.value - a.value) 

  const ventasMensuales = pagosCompletados.reduce((acc: any, pago) => {
    const fecha = new Date(pago.fecha)
    const formatter = new Intl.DateTimeFormat('es-ES', { month: 'short' })
    const mes = formatter.format(fecha).replace('.', '')
    const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1)
    const año = fecha.getFullYear()
    
    const key = `${mesCapitalizado} ${año}`
    const orden = año * 100 + fecha.getMonth() 
    const moneda = pago.moneda?.toUpperCase() || 'COP'
    const valorConvertido = pago.importe * (pago.tasa_cambio || 1)

    if (!acc[key]) acc[key] = { name: key, orden }
    if (!acc[key][moneda]) acc[key][moneda] = 0
    // Sumamos el valor normalizado en COP, pero lo agrupamos por su moneda de origen visualmente
    acc[key][moneda] += valorConvertido 
    
    return acc
  }, {})

  const datosHistograma = Object.values(ventasMensuales).sort((a: any, b: any) => a.orden - b.orden)
  const monedasEnHistograma = Array.from(new Set(pagosCompletados.map(p => p.moneda?.toUpperCase() || 'COP')))

  // --- EXPORTACIÓN (Incluye conversión auditable) ---
  const exportarCSV = () => {
    const cabeceras = ['ID Pago', 'Cliente', 'Email', 'Curso', 'Importe Original', 'Moneda', 'Tasa Cambio', 'Equivalente COP', 'Estado', 'Fecha']
    const filas = pagosFiltrados.map(p => [
      p.id_pago, p.nombre || 'N/A', p.email || 'N/A', p.curso || 'N/A',
      p.importe, p.moneda?.toUpperCase() || 'COP', p.tasa_cambio || 1, p.importe * (p.tasa_cambio || 1),
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
      
      {/* Marca de agua */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
        <h1 className="text-[20vw] font-black text-white tracking-tighter">LOGALI</h1>
      </div>

      <div className="relative z-10">
        {/* HEADER */}
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
          
          {/* CONTROLES AVANZADOS */}
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" placeholder="Buscar ID, cliente o email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm outline-none bg-gray-950 text-gray-200 placeholder-gray-500 transition-all"
                />
              </div>

              <div className="flex items-center border border-gray-700 rounded-lg px-3 py-1.5 bg-gray-950 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <Calendar size={16} className="text-gray-500 mr-2" />
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="text-sm outline-none bg-transparent text-gray-300 color-scheme-dark" />
                <span className="text-gray-500 mx-2 text-sm">hasta</span>
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="text-sm outline-none bg-transparent text-gray-300 color-scheme-dark" />
              </div>

              <select 
                value={filtroMoneda} 
                onChange={(e) => setFiltroMoneda(e.target.value)}
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
                {['todos', 'completed', 'refunded', 'failed'].map(estado => (
                  <button
                    key={estado}
                    onClick={() => setFiltroEstado(estado)}
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

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard 
              titulo="Ingresos Netos (COP)" 
              valor={<div className="text-3xl font-bold text-gray-100 mt-1">{formatearMoneda(ingresosTotalesCOP, 'COP')}</div>} 
              icono={<DollarSign className="text-emerald-400" />} 
            />
            <KpiCard 
              titulo="Volumen de Pagos" 
              valor={<div className="text-3xl font-bold text-gray-100 mt-1">{pagosFiltrados.length}</div>} 
              icono={<CreditCard className="text-blue-400" />} 
            />
            <KpiCard 
              titulo="Tasa de Reembolsos" 
              valor={<div className="text-3xl font-bold text-gray-100 mt-1">{pagosFiltrados.filter(p => p.estado === 'refunded').length}</div>} 
              icono={<RefreshCcw className="text-amber-400" />} 
            />
            <KpiCard 
              titulo="Ticket Promedio (COP)" 
              valor={<div className="text-3xl font-bold text-gray-100 mt-1">{formatearMoneda(ticketMedioCOP, 'COP')}</div>} 
              icono={<TrendingUp className="text-purple-400" />} 
            />
          </div>

          {/* GRÁFICOS BI */}
          {pagosFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
                <h2 className="text-sm font-bold text-gray-300 mb-1">Composición de Ingresos (Valor COP)</h2>
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={datosIngresos} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                        {datosIngresos.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />)}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatearMoneda(value, 'COP')} 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #374151', backgroundColor: '#1F2937', color: '#F3F4F6' }} 
                        itemStyle={{ color: '#E5E7EB' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
                <h2 className="text-sm font-bold text-gray-300 mb-1">Riesgo por Producto</h2>
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosRiesgo} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
                      <Tooltip 
                        cursor={{ fill: '#1F2937' }} 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #374151', backgroundColor: '#1F2937', color: '#F3F4F6' }} 
                        formatter={(value: number) => `${value}%`} 
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px', color: '#9CA3AF' }} />
                      <Bar dataKey="Tasa de Éxito (%)" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} maxBarSize={40} />
                      <Bar dataKey="Probabilidad de Riesgo (%)" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl lg:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-sm font-bold text-gray-300">Evolución de Ingresos Equivalentes (COP)</h2>
                  <span className="text-xs text-blue-400 bg-blue-900/30 border border-blue-800/50 px-2 py-1 rounded font-medium">Vista Mensual</span>
                </div>
                <div className="h-72 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosHistograma} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9CA3AF', fontSize: 11 }} 
                        tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val)} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#1F2937' }} 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #374151', backgroundColor: '#1F2937', color: '#F3F4F6' }} 
                        formatter={(value: number, name: string) => [formatearMoneda(value, 'COP'), `Origen: ${name}`]} 
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px', color: '#9CA3AF' }} />
                      
                      {monedasEnHistograma.map((moneda, index) => (
                        <Bar 
                          key={moneda} 
                          dataKey={moneda} 
                          name={moneda} 
                          fill={COLORES[index % COLORES.length]} 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={50} 
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : null}

          {/* TABLA DE DATOS */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-950/50 border-b border-gray-800 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">ID Pago</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Curso</th>
                    <th className="px-6 py-4">Importe Original</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {pagosPaginados.length > 0 ? (
                    pagosPaginados.map((pago) => (
                      <tr key={pago.id_pago} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{pago.id_pago}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-200">{pago.nombre || 'Sin nombre'}</div>
                          <div className="text-gray-500 text-xs">{pago.email}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{pago.curso}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-200 inline-flex items-center gap-1.5">
                              {formatearMoneda(pago.importe, pago.moneda || 'COP')}
                              <span className="text-[9px] font-bold text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded uppercase border border-gray-700">
                                {pago.moneda || 'COP'}
                              </span>
                            </div>
                            {/* Trazabilidad: Muestra el equivalente en COP si la moneda original es diferente */}
                            {((pago.moneda || 'COP').toUpperCase() !== 'COP') && (
                              <span className="text-[11px] text-gray-500 mt-0.5">
                                ≈ {formatearMoneda((pago.importe * (pago.tasa_cambio || 1)), 'COP')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            pago.estado === 'completed' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 
                            pago.estado === 'refunded' ? 'bg-amber-900/30 text-amber-400 border-amber-800/50' : 
                            'bg-red-900/30 text-red-400 border-red-800/50'
                          }`}>
                            {pago.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">{new Date(pago.fecha).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No se encontraron pagos con los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN */}
            {pagosFiltrados.length > 0 && (
              <div className="bg-gray-950/50 px-6 py-4 border-t border-gray-800 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Mostrando <span className="font-medium text-gray-300">{indicePrimerPago + 1}</span> a <span className="font-medium text-gray-300">{Math.min(indiceUltimoPago, pagosFiltrados.length)}</span> de <span className="font-medium text-gray-300">{pagosFiltrados.length}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))} disabled={paginaActual === 1} className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-semibold text-gray-400 px-3 py-1 bg-gray-800 rounded-md">
                    {paginaActual} / {totalPaginas}
                  </span>
                  <button onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas} className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}

function KpiCard({ titulo, valor, icono }: { titulo: string, valor: React.ReactNode, icono: React.ReactNode }) {
  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl flex items-start gap-4 relative overflow-hidden group min-h-[110px]">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-800/50 to-transparent transform rotate-45 translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-700"></div>
      <div className="p-3 bg-gray-950 rounded-lg relative z-10 border border-gray-800 mt-1 shadow-inner">{icono}</div>
      <div className="relative z-10 w-full">
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1">{titulo}</p>
        <div className="w-full">{valor}</div>
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