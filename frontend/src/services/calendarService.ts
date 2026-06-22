import api from "./api";

export interface CalendarEvent {
  id: number;
  site: number;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  event_type: string;
  created_at: string;
  updated_at: string;
}

export interface UnifiedCalendar {
  operations: import("./metrajService").MetrajOperation[];
  events: CalendarEvent[];
}

export const calendarService = {
  async unified(siteId: number) {
    const { data } = await api.get<UnifiedCalendar>("/calendar/unified/", {
      params: { site_id: siteId },
    });
    return data;
  },

  async listEvents(siteId: number) {
    const { data } = await api.get<CalendarEvent[]>("/calendar/events/", {
      params: { site_id: siteId },
    });
    return data;
  },

  async createEvent(payload: {
    site_id: number;
    title: string;
    description?: string;
    event_date: string;
    event_time?: string | null;
    event_type?: string;
  }) {
    const { data } = await api.post<CalendarEvent>("/calendar/events/", payload);
    return data;
  },

  async updateEvent(id: number, payload: Partial<CalendarEvent>) {
    const { data } = await api.patch<CalendarEvent>(`/calendar/events/${id}/`, payload);
    return data;
  },

  async deleteEvent(id: number) {
    await api.delete(`/calendar/events/${id}/`);
  },
};
