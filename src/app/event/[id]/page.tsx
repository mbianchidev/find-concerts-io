import { mockEvents } from '@/data/mockData';
import EventDetailClient from './EventDetailClient';

export async function generateStaticParams() {
  return mockEvents.map((event) => ({
    id: event.id,
  }));
}

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  return <EventDetailClient params={params} />;
}