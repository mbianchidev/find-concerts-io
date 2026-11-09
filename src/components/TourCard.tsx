import Link from 'next/link';
import type { Tour } from '@/types';
import { formatDate } from '@/lib/utils';
import Icon from './Icon';

export default function TourCard({ tour }: { tour: Tour }) {
  return (
    <article className="tour-card">
      <p className="eyebrow">
        {tour.event_count} listed shows / {tour.cities.join(', ')}
      </p>
      <h2>{tour.artist}</h2>
      <p>
        {formatDate(tour.start_date)} to {formatDate(tour.end_date)}
      </p>
      <ul>
        {tour.events.map((event) => (
          <li key={event.id}>
            <span>
              {event.datetime ? formatDate(event.datetime, true) : 'TBA'}
            </span>
            <Link href={`/events/${encodeURIComponent(event.id)}`}>
              {event.venue.name}
              <Icon name="arrow" />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
