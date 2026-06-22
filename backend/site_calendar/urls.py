from django.urls import path

from .views import CalendarEventDetailView, CalendarEventListCreateView, UnifiedCalendarView

urlpatterns = [
    path("calendar/events/", CalendarEventListCreateView.as_view(), name="calendar-events"),
    path("calendar/events/<int:pk>/", CalendarEventDetailView.as_view(), name="calendar-event-detail"),
    path("calendar/unified/", UnifiedCalendarView.as_view(), name="calendar-unified"),
]
