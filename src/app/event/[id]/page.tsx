import { getAllEvents } from '@/lib/api';
import EventDetailClient from './EventDetailClient';

export async function generateStaticParams() {
  try {
    const events = await getAllEvents('demo-app-id');
    return events.map((event) => ({
      id: event.id,
    }));
  } catch (error) {
    console.error('Failed to generate static params:', error);
    return [];
  }
}

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  return <EventDetailClient params={params} />;
}