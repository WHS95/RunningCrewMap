import { marathonService } from "@/lib/services/marathon.service";
import EventsClient from "./_components/EventsClient";

export default function EventsPage() {
  // Load all events on the server (in-memory data, no async needed)
  const allEvents = marathonService.getMarathonEvents();
  const initialMonth = new Date().getMonth() + 1; // 1-12

  return <EventsClient allEvents={allEvents} initialMonth={initialMonth} />;
}
