export interface PagoFormaPro {
  id_pago: string;
  email: string | null;
  nombre: string | null;
  curso: string | null;
  importe: number;
  moneda: string | null;
  estado: 'completed' | 'refunded' | 'failed';
  fecha: string;
  procesado_en?: string;
}