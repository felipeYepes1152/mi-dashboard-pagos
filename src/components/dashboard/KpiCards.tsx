import { DollarSign, CreditCard, RefreshCcw, TrendingUp } from 'lucide-react'
import { formatearMoneda } from '../../lib/formatters'
import { PagoFormaPro } from '../../types/dashboard'

interface KpiCardProps {
  titulo: string;
  valor: React.ReactNode;
  icono: React.ReactNode;
}

function KpiCard({ titulo, valor, icono }: KpiCardProps) {
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

interface KpiCardsProps {
  pagosFiltrados: PagoFormaPro[];
}

export default function KpiCards({ pagosFiltrados }: KpiCardsProps) {
  const pagosCompletados = pagosFiltrados.filter(p => p.estado === 'completed')
  
  const ingresosTotalesCOP = pagosCompletados.reduce<number>((acc, pago) => {
    const tasa = pago.tasa_cambio || 1
    return acc + (pago.importe * tasa)
  }, 0)

  const ticketMedioCOP = pagosCompletados.length > 0 
    ? ingresosTotalesCOP / pagosCompletados.length 
    : 0

  return (
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
  )
}