import { useState, useEffect, useCallback } from "react";
import { vscode } from "./vscode";
import { DecisionTracePanel } from "./panels/DecisionTracePanel";
import { RawDataPanel } from "./panels/RawDataPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import type { TraceEvent, Settings } from "./types";
import "./index.css";

type TabId = "trace" | "raw" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "trace", label: "Decision Trace", icon: "📋" },
  { id: "raw", label: "Raw Data", icon: "🔍" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("trace");
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();

  const handleMessage = useCallback((event: MessageEvent) => {
    const message = event.data;
    switch (message.type) {
      case "traceEventsData":
        setEvents(message.payload.events || []);
        break;
      case "settingsData":
        setSettings(message.payload);
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    const messageTypes: Record<TabId, string> = {
      trace: "getTraceEvents",
      raw: "getTraceEvents",
      settings: "getSettings",
    };
    vscode.postMessage({ type: messageTypes[activeTab] });
  }, [activeTab]);

  const handleSelectEvent = (evt: TraceEvent) => {
    setSelectedEventId(evt.id);
    setActiveTab("raw");
  };

  const selectedEvent = events.find(e => e.id === selectedEventId) || null;

  // Compute session summary
  const platform = events.length > 0 ? events[events.length - 1].platform : "None";
  const started = events.length > 0 ? new Date(events[0].timestamp).toLocaleTimeString() : "N/A";
  const fileReads = events.filter(e => e.actionType === "FILE_READ").length;
  const toolCalls = events.filter(e => e.actionType === "TOOL_CALL").length;
  const commands = events.filter(e => e.actionType === "COMMAND_EXECUTED").length;
  const memories = events.filter(e => e.actionType === "MEMORY_LOADED").length;

  return (
    <div className="app">
      <div className="session-header">
        <div className="session-title">Current Session</div>
        <div className="session-metrics">
          <div className="metric-row"><span className="metric-label">Platform:</span> <span className="metric-value">{platform}</span></div>
          <div className="metric-row"><span className="metric-label">Started:</span> <span className="metric-value">{started}</span></div>
          <div className="metric-row"><span className="metric-label">Events:</span> <span className="metric-value">{events.length}</span></div>
          <div className="metric-row"><span className="metric-label">Files Read:</span> <span className="metric-value">{fileReads}</span></div>
          <div className="metric-row"><span className="metric-label">Tool Calls:</span> <span className="metric-value">{toolCalls}</span></div>
          <div className="metric-row"><span className="metric-label">Commands:</span> <span className="metric-value">{commands}</span></div>
          <div className="metric-row"><span className="metric-label">Memories:</span> <span className="metric-value">{memories}</span></div>
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="app-content">
        {activeTab === "trace" && (
          <DecisionTracePanel
            events={events}
            onSelectEvent={handleSelectEvent}
            selectedEventId={selectedEventId}
          />
        )}
        {activeTab === "raw" && (
          <RawDataPanel event={selectedEvent} />
        )}
        {activeTab === "settings" && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={(s) => vscode.postMessage({ type: "updateSettings", payload: s })}
          />
        )}
      </div>
    </div>
  );
}
