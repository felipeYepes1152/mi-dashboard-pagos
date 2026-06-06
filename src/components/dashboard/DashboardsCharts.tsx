import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { formatearMoneda } from '../../lib/formatters'
import { PagoFormaPro } from '../../types/dashboard'

const COLORES = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

interface DashboardChartsProps {
  pagosFiltrados: PagoFormaPro[];
}

interface StatsCurso {
  nombre: string;
  total: number;
  exito: number;
  riesgo: number;
}

interface VentaCurso {
  totalCOP: number;
}

interface VentaMensual {
  name: string;
  orden: number;
  [key: string]: string | number; 
}

// Funciones auxiliares ultra-seguras para parsear los Tooltips sin usar "any"
const toNum = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return Number(val) || 0;
  return 0; // Fallback seguro si recharts envía un array u undefined
};

const toStr = (val: unknown): string => {
  return typeof val === 'string' || typeof val === 'number' ? String(val) : 'Desconocido';
};

export default function DashboardCharts({ pagosFiltrados }: DashboardChartsProps) {
  if (pagosFiltrados.length === 0) return null

  const pagosCompletados = pagosFiltrados.filter(p => p.estado === 'completed')

  // --- CÁLCULO 1: Riesgo por Producto ---
  const statsPorCurso = pagosFiltrados.reduce<Record<string, StatsCurso>>((acc, pago) => {
    const curso = pago.curso || 'Otros'
    if (!acc[curso]) acc[curso] = { nombre: curso, total: 0, exito: 0, riesgo: 0 }
    acc[curso].total += 1
    pago.estado === 'completed' ? acc[curso].exito += 1 : acc[curso].riesgo += 1 
    return acc
  }, {})

  const datosRiesgo = Object.values(statsPorCurso).map(c => ({
    name: c.nombre,
    'Tasa de Éxito (%)': Number(((c.exito / c.total) * 100).toFixed(1)),
    'Probabilidad de Riesgo (%)': Number(((c.riesgo / c.total) * 100).toFixed(1))
  }))

  // --- CÁLCULO 2: Composición de Ingresos ---
  const ventasPorCurso = pagosCompletados.reduce<Record<string, VentaCurso>>((acc, pago) => {
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

  // --- CÁLCULO 3: Histograma Evolutivo ---
  const ventasMensuales = pagosCompletados.reduce<Record<string, VentaMensual>>((acc, pago) => {
    const fecha = new Date(pago.fecha)
    const formatter = new Intl.DateTimeFormat('es-ES', { month: 'short' })
    const mes = formatter.format(fecha).replace('.', '')
    const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1)
    const año = fecha.getFullYear()
    
    const key = `${mesCapitalizado} ${año}`
    const orden = año * 100 + fecha.getMonth() 
    const moneda = (pago.moneda || 'COP').toUpperCase()
    const valorConvertido = pago.importe * (pago.tasa_cambio || 1)

    if (!acc[key]) acc[key] = { name: key, orden }
    
    const valorActual = Number(acc[key][moneda]) || 0
    acc[key][moneda] = valorActual + valorConvertido 
    
    return acc
  }, {})

  const datosHistograma = Object.values(ventasMensuales).sort((a: VentaMensual, b: VentaMensual) => a.orden - b.orden)
  const monedasEnHistograma = Array.from(new Set(pagosCompletados.map(p => (p.moneda || 'COP').toUpperCase())))

  return (
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
                formatter={(value: unknown) => formatearMoneda(toNum(value), 'COP')} 
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
                formatter={(value: unknown) => `${toNum(value)}%`} 
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
                tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(Number(val))} 
              />
              <Tooltip 
                cursor={{ fill: '#1F2937' }} 
                contentStyle={{ borderRadius: '8px', border: '1px solid #374151', backgroundColor: '#1F2937', color: '#F3F4F6' }} 
                formatter={(value: unknown, name: unknown) => [formatearMoneda(toNum(value), 'COP'), `Origen: ${toStr(name)}`]} 
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
  )
}