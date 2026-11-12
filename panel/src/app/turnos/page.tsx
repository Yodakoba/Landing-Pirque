import CalendarioEquipo from '@/components/CalendarioEquipo';
import { esFecha } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

/** `?dia=AAAA-MM-DD` abre ese mes y la ventana de ese día (2026-11-12): lo usa el informe para mandar a marcar. */
export default function Pagina({ searchParams }: { searchParams?: { dia?: string } }) {
  const dia = esFecha(searchParams?.dia) ? searchParams!.dia : undefined;
  return <CalendarioEquipo dia={dia} />;
}
