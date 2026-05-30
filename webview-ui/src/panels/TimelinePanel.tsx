// ============================================================
// Timeline Panel — Feature 3: Context changes over time
// ============================================================
import type { TimelineEvent } from "../types";

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getEventLabel(type: TimelineEvent["type"]): string {
  switch (type) {
    case "file_opened": return "Opened";
    case "file_edited": return "Edited";
    case "file_closed": return "Closed";
    case "ai_interaction": return "AI";
    default: return type;
  }
}

function getEventIcon(type: TimelineEvent["type"]): string {
  switch (type) {
    case "file_opened": return "📂";
    case "file_edited": return "✏️";
    case "file_closed": return "📕";
    case "ai_interaction": return "🤖";
    default: return "•";
  }
}

interface Props {
  data: TimelineEvent[];
}

export function TimelinePanel({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🕐</div>
        <div className="empty-state-text">
          No events recorded yet. Start working to see your timeline.
        </div>
      </div>
    );
  }

  // Group events by date
  const groups: Map<string, TimelineEvent[]> = new Map();
  for (const event of data) {
    const dateKey = formatDate(event.timestamp);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(event);
  }

  return (
    <div>
      <div className="section">
        <div className="section-header">
          <span className="section-header-icon">🕐</span>
          Context Timeline
        </div>
        <div className="text-small text-muted mb-8">
          {data.length} event{data.length !== 1 ? "s" : ""} today
        </div>

        {Array.from(groups.entries()).map(([dateKey, events]) => (
          <div key={dateKey}>
            <div
              className="text-small text-muted mb-4 mt-8"
              style={{ fontWeight: 600 }}
            >
              {dateKey}
            </div>
            <div className="timeline">
              {events.map((event) => (
                <div key={event.id} className="timeline-event">
                  <div className={`timeline-dot ${event.type}`} />
                  <div className="timeline-time">
                    {formatTime(event.timestamp)}
                  </div>
                  <div className="timeline-details">
                    {getEventIcon(event.type)}{" "}
                    {event.details || event.fileName || "Unknown event"}
                    <span className="timeline-type">
                      {getEventLabel(event.type)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
