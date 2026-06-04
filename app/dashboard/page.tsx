'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import type { PagoFormaPro } from '@/src/types/database'
import { useRouter } from 'next/navigation'
import { DollarSign, CreditCard, RefreshCcw, TrendingUp, LogOut, Search, Download, ChevronLeft, ChevronRight, Filter, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

// UTILIDAD MULTIMONEDA
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
  
  // Estados de Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [filtroMoneda, setFiltroMoneda] = useState<string>('Todas')
  const [monedasDisponibles, setMonedasDisponibles] = useState<string[]>([])
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const pagosPorPagina = 5

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

  // Paginación
  const indiceUltimoPago = paginaActual * pagosPorPagina
  const indicePrimerPago = indiceUltimoPago - pagosPorPagina
  const pagosPaginados = pagosFiltrados.slice(indicePrimerPago, indiceUltimoPago)
  const totalPaginas = Math.max(1, Math.ceil(pagosFiltrados.length / pagosPorPagina))

  // --- KPIs DE NEGOCIO ---
  const pagosCompletados = pagosFiltrados.filter(p => p.estado === 'completed')
  
  const ingresosPorMoneda = pagosCompletados.reduce((acc, pago) => {
    const m = pago.moneda?.toUpperCase() || 'COP'
    acc[m] = (acc[m] || 0) + pago.importe
    return acc
  }, {} as Record<string, number>)

  const ingresosNode = Object.keys(ingresosPorMoneda).length > 0 ? (
    <div className="flex flex-col gap-1.5 mt-1">
      {Object.entries(ingresosPorMoneda).map(([m, val]) => (
        <div key={m} className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-gray-900 leading-none">{formatearMoneda(val, m)}</span>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{m}</span>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex items-baseline gap-1.5 mt-1">
      <span className="text-xl font-bold text-gray-900 leading-none">{formatearMoneda(0, filtroMoneda !== 'Todas' ? filtroMoneda : 'COP')}</span>
      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{filtroMoneda !== 'Todas' ? filtroMoneda : 'COP'}</span>
    </div>
  )

  const ticketMedioNode = pagosCompletados.length > 0 ? (
    <div className="flex flex-col gap-1.5 mt-1">
      {Object.entries(ingresosPorMoneda).map(([m, val]) => {
        const qty = pagosCompletados.filter(p => (p.moneda?.toUpperCase() || 'COP') === m).length
        return (
          <div key={m} className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-gray-900 leading-none">{formatearMoneda(val / qty, m)}</span>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{m}</span>
          </div>
        )
      })}
    </div>
  ) : (
    <div className="flex items-baseline gap-1.5 mt-1">
      <span className="text-xl font-bold text-gray-900 leading-none">{formatearMoneda(0, filtroMoneda !== 'Todas' ? filtroMoneda : 'COP')}</span>
      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{filtroMoneda !== 'Todas' ? filtroMoneda : 'COP'}</span>
    </div>
  )

  // --- GRÁFICOS REACTIVOS ---
  const COLORES = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

  // 1. Probabilidad de Riesgo
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

  // 2. Composición (Dona)
  const ventasPorCurso = pagosCompletados.reduce((acc: any, pago) => {
    const monedaLabel = filtroMoneda === 'Todas' ? ` (${pago.moneda?.toUpperCase() || 'COP'})` : ''
    const curso = (pago.curso || 'Otros') + monedaLabel
    if (!acc[curso]) acc[curso] = { total: 0, moneda: pago.moneda?.toUpperCase() || 'COP' }
    acc[curso].total += pago.importe
    return acc
  }, {})

  const datosIngresos = Object.keys(ventasPorCurso).map(curso => ({
    name: curso,
    value: ventasPorCurso[curso].total,
    moneda: ventasPorCurso[curso].moneda
  })).sort((a, b) => b.value - a.value) 

  // 3. HISTOGRAMA (Evolución Mensual de Ventas)
  const ventasMensuales = pagosCompletados.reduce((acc: any, pago) => {
    const fecha = new Date(pago.fecha)
    const formatter = new Intl.DateTimeFormat('es-ES', { month: 'short' })
    const mes = formatter.format(fecha).replace('.', '')
    const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1)
    const año = fecha.getFullYear()
    
    const key = `${mesCapitalizado} ${año}`
    const orden = año * 100 + fecha.getMonth() // Para ordenar cronológicamente
    const moneda = pago.moneda?.toUpperCase() || 'COP'

    if (!acc[key]) acc[key] = { name: key, orden }
    if (!acc[key][moneda]) acc[key][moneda] = 0
    acc[key][moneda] += pago.importe
    
    return acc
  }, {})

  const datosHistograma = Object.values(ventasMensuales).sort((a: any, b: any) => a.orden - b.orden)
  // Extraemos las monedas específicas que se usaron en este set de datos para dibujar sus barras
  const monedasEnHistograma = Array.from(new Set(pagosCompletados.map(p => p.moneda?.toUpperCase() || 'COP')))

  // --- EXPORTACIÓN ---
  const exportarCSV = () => {
    const cabeceras = ['ID Pago', 'Cliente', 'Email', 'Curso', 'Importe', 'Moneda', 'Estado', 'Fecha']
    const filas = pagosFiltrados.map(p => [
      p.id_pago, p.nombre || 'N/A', p.email || 'N/A', p.curso || 'N/A',
      p.importe, p.moneda?.toUpperCase() || 'COP', p.estado, new Date(p.fecha).toLocaleDateString()
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative overflow-hidden">
      
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
        <h1 className="text-[20vw] font-black text-gray-900 tracking-tighter">LOGALI</h1>
      </div>

      <div className="relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">L</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Logali <span className="font-light">Analytics</span></h1>
          </div>
          <button onClick={cerrarSesion} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors font-medium">
            <LogOut size={16} /> Salir
          </button>
        </header>

        <main className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* CONTROLES AVANZADOS */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" placeholder="Buscar ID, cliente o email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm outline-none bg-gray-50"
                />
              </div>

              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <Calendar size={16} className="text-gray-400 mr-2" />
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="text-sm outline-none text-gray-700 bg-transparent" />
                <span className="text-gray-400 mx-2 text-sm">hasta</span>
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="text-sm outline-none text-gray-700 bg-transparent" />
              </div>

              <select 
                value={filtroMoneda} 
                onChange={(e) => setFiltroMoneda(e.target.value)}
                className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none bg-gray-50 text-gray-700 focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="Todas">🌍 Todas las Monedas</option>
                {monedasDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                <Filter size={16} className="text-gray-400 ml-1 mr-1" />
                {['todos', 'completed', 'refunded', 'failed'].map(estado => (
                  <button
                    key={estado}
                    onClick={() => setFiltroEstado(estado)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all whitespace-nowrap ${
                      filtroEstado === estado 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {estado}
                  </button>
                ))}
              </div>
              <button onClick={exportarCSV} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Download size={16} /> <span className="hidden sm:inline">Exportar Datos</span>
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard titulo="Ingresos Netos" valor={ingresosNode} icono={<DollarSign className="text-emerald-600" />} />
            <KpiCard titulo="Volumen de Pagos" valor={<div className="text-2xl font-bold mt-1">{pagosFiltrados.length}</div>} icono={<CreditCard className="text-blue-600" />} />
            <KpiCard titulo="Tasa de Reembolsos" valor={<div className="text-2xl font-bold mt-1">{pagosFiltrados.filter(p => p.estado === 'refunded').length}</div>} icono={<RefreshCcw className="text-amber-600" />} />
            <KpiCard titulo="Ticket Promedio" valor={ticketMedioNode} icono={<TrendingUp className="text-purple-600" />} />
          </div>

          {/* GRÁFICOS BI */}
          {pagosFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico 1: Dona */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-sm font-bold text-gray-800 mb-1">Composición de Ingresos</h2>
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={datosIngresos} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {datosIngresos.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string, props: any) => formatearMoneda(value, props.payload.moneda)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Riesgo */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-sm font-bold text-gray-800 mb-1">Riesgo por Producto</h2>
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosRiesgo} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
                      <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => `${value}%`} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                      <Bar dataKey="Tasa de Éxito (%)" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} maxBarSize={40} />
                      <Bar dataKey="Probabilidad de Riesgo (%)" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 3: Histograma Evolutivo (Ancho Completo) */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-sm font-bold text-gray-800">Evolución de Ingresos Netos</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Vista Mensual</span>
                </div>
                <div className="h-72 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosHistograma} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} dy={10} />
                      {/* Eje Y con notación compacta para números grandes (ej. 1K, 1M) */}
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6B7280', fontSize: 11 }} 
                        tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val)} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#F3F4F6' }} 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} 
                        formatter={(value: number, name: string) => [formatearMoneda(value, name), `Ingresos en ${name}`]} 
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                      
                      {/* Genera una barra por cada moneda activa en el mes */}
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                  <tr>
                    <th className="px-6 py-4">ID Pago</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Curso</th>
                    <th className="px-6 py-4">Importe</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagosPaginados.length > 0 ? (
                    pagosPaginados.map((pago) => (
                      <tr key={pago.id_pago} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{pago.id_pago}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{pago.nombre || 'Sin nombre'}</div>
                          <div className="text-gray-500 text-xs">{pago.email}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{pago.curso}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 inline-flex items-center gap-1.5">
                            {formatearMoneda(pago.importe, pago.moneda || 'COP')}
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                              {pago.moneda || 'COP'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                            pago.estado === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            pago.estado === 'refunded' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {pago.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{new Date(pago.fecha).toLocaleDateString()}</td>
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
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Mostrando <span className="font-medium text-gray-900">{indicePrimerPago + 1}</span> a <span className="font-medium text-gray-900">{Math.min(indiceUltimoPago, pagosFiltrados.length)}</span> de <span className="font-medium text-gray-900">{pagosFiltrados.length}</span> resultados
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))} disabled={paginaActual === 1} className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium text-gray-700 px-2">{paginaActual} / {totalPaginas}</span>
                  <button onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas} className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronRight size={20} />
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
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4 relative overflow-hidden group min-h-[110px]">
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-gray-50 to-white transform rotate-45 translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500"></div>
      <div className="p-3 bg-gray-50 rounded-lg relative z-10 border border-gray-100 mt-1">{icono}</div>
      <div className="relative z-10 w-full">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{titulo}</p>
        <div className="w-full">{valor}</div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
      <div className="h-20 bg-gray-200 rounded-xl mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-gray-200 rounded-xl"></div>
        <div className="h-80 bg-gray-200 rounded-xl"></div>
        <div className="h-80 bg-gray-200 rounded-xl lg:col-span-2"></div>
      </div>
      <div className="h-96 bg-gray-200 rounded-xl"></div>
    </div>
  )
}