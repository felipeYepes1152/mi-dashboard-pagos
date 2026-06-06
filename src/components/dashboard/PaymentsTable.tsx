import { Dispatch, SetStateAction } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatearMoneda } from '../../lib/formatters'
import { PagoFormaPro } from '../../types/dashboard'

interface PaymentsTableProps {
  pagosPaginados: PagoFormaPro[];
  totalFiltrados: number;
  paginaActual: number;
  totalPaginas: number;
  setPaginaActual: Dispatch<SetStateAction<number>>;
  indicePrimerPago: number;
  indiceUltimoPago: number;
}

export default function PaymentsTable({
  pagosPaginados, totalFiltrados, paginaActual, totalPaginas, setPaginaActual, indicePrimerPago, indiceUltimoPago
}: PaymentsTableProps) {
  return (
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
                    <div className="text-gray-500 text-xs">{pago.email || 'Sin email'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{pago.curso || 'Sin curso'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="font-medium text-gray-200 inline-flex items-center gap-1.5">
                        {formatearMoneda(pago.importe, pago.moneda || 'COP')}
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded uppercase border border-gray-700">
                          {pago.moneda || 'COP'}
                        </span>
                      </div>
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

      {totalFiltrados > 0 && (
        <div className="bg-gray-950/50 px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Mostrando <span className="font-medium text-gray-300">{indicePrimerPago + 1}</span> a <span className="font-medium text-gray-300">{Math.min(indiceUltimoPago, totalFiltrados)}</span> de <span className="font-medium text-gray-300">{totalFiltrados}</span>
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
  )
}