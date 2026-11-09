import { z } from 'zod';
import type {
  Artist,
  Event,
  ImportReport,
  Notification,
  SavedItem,
  SourceStatus,
  Tour,
  User,
  VenueData,
} from '@/types';

export function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const link = z
  .string()
  .max(2048)
  .refine((value) => !value || isWebUrl(value), 'Use an HTTP or HTTPS URL.');
const fieldValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const eventSchema: z.ZodType<Event> = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  datetime: z.string().max(80).nullable(),
  end_datetime: z.string().max(80).optional(),
  date_only: z.boolean().optional(),
  date_label: z.string().max(2000).optional(),
  description: z.string().max(20000).optional(),
  venue: z.object({
    name: z.string().max(1000),
    city: z.string().max(500),
    region: z.string().max(500),
    country: z.string().max(500),
    latitude: z.string().max(30),
    longitude: z.string().max(30),
  }),
  lineup: z.array(z.string().max(500)).max(100),
  genres: z.array(z.string().max(100)).max(30),
  url: link,
  image_url: link.optional(),
  source: z.object({
    id: z.string().max(100),
    name: z.string().max(300),
    url: link,
    fetched_at: z.string().max(80),
    genre_basis: z.enum(['description', 'calendar']).optional(),
  }),
  status: z.enum(['scheduled', 'cancelled', 'postponed', 'sold_out']),
  popularity: z.number().int().nonnegative(),
  is_private: z.boolean().optional(),
  reason: z.string().optional(),
  import_details: z
    .object({
      sheet: z.string(),
      row: z.number().int().positive(),
      fields: z.record(z.string(), fieldValue),
      attendance: z.string().optional(),
      price: z.string().optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export const userSchema: z.ZodType<User> = z.object({
  id: z.string(),
  username: z.string(),
  display_name: z.string().max(80).default(''),
  location: z.string().max(120).default(''),
  bio: z.string().max(500).default(''),
  email: z.string().optional(),
  email_notifications: z.boolean(),
  role: z.enum(['admin', 'user']),
});

export const profileUpdateSchema = z
  .object({
    display_name: z.string().trim().max(80).optional(),
    location: z.string().trim().max(120).optional(),
    bio: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    'Choose at least one profile field to update.'
  );

export const savedItemSchema: z.ZodType<SavedItem> = z.object({
  id: z.string(),
  type: z.enum(['event', 'artist', 'venue']),
  addedAt: z.string(),
});

export const notificationSchema: z.ZodType<Notification> = z.object({
  id: z.string(),
  event_id: z.string(),
  title: z.string(),
  created_at: z.string(),
  read_at: z.string().nullable(),
});

export const sourceStatusSchema: z.ZodType<SourceStatus> = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  last_run: z.string().nullable(),
  event_count: z.number(),
  error: z.string().nullable(),
});

export const importReportSchema: z.ZodType<ImportReport> = z.object({
  total: z.number(),
  errors: z.number().optional(),
  imported: z.number(),
  duplicates: z.number(),
  skipped: z.number(),
  issues: z.array(
    z.object({
      sheet: z.string(),
      row: z.number(),
      message: z.string(),
      level: z.enum(['warning', 'error']),
    })
  ),
});

export const mappingSchema = z.object({
  sheet: z.string().min(1).max(200),
  headerRow: z.number().int().min(1).max(20),
  title: z.string().min(1),
  date: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  attendance: z.string().optional(),
  price: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  dateOrder: z.enum(['day-first', 'month-first']).optional(),
});

export type WorkbookMapping = z.infer<typeof mappingSchema>;

export const workbookPreviewSchema = z.object({
  sheets: z.array(
    z.object({
      name: z.string(),
      headers: z.array(z.string()),
      rows: z.number(),
      sample: z.array(z.record(z.string(), fieldValue)),
      mapping: mappingSchema.extend({ title: z.string() }),
    })
  ),
});

export type WorkbookPreview = z.infer<typeof workbookPreviewSchema>;

export const notificationConfigSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  publicKey: z.string().nullable(),
});

export const spotifyArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  genres: z.array(z.string()),
  url: link,
  preview_url: link.nullable(),
});

export const artistSchema: z.ZodType<Artist> = z.object({
  id: z.string(),
  name: z.string(),
  genres: z.array(z.string()),
  image_url: z.string().optional(),
  upcoming_event_count: z.number(),
  url: z.string(),
});

export const venueSchema: z.ZodType<VenueData> = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  city: z.string(),
  region: z.string(),
  country: z.string(),
  event_count: z.number(),
  image_url: z.string().optional(),
  genres: z.array(z.string().max(100)).max(30).optional(),
  url: link.optional(),
  source_url: link.optional(),
});

export const tourSchema: z.ZodType<Tour> = z.object({
  id: z.string(),
  name: z.string(),
  artist: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  event_count: z.number(),
  cities: z.array(z.string()),
  events: z.array(eventSchema),
});
