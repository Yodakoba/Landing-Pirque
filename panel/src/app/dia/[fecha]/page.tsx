import DayView from '@/components/DayView';

export const dynamic = 'force-dynamic';

export default function Pagina({ params }: { params: { fecha: string } }) {
  return <DayView fecha={params.fecha} />;
}
