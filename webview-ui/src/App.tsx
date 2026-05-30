import { useState, useEffect, useCallback } from "react";
import { vscode } from "./vscode";
import { ContextPanel } from "./panels/ContextPanel";
import { FilesPanel } from "./panels/FilesPanel";
import { TimelinePanel } from "./panels/TimelinePanel";
import { AnalysisPanel } from "./panels/AnalysisPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import type {
  ContextData,
  InfluenceResult,
  TimelineEvent,
  AnalysisData,
  Settings,
  ProjectRule,
} from "./types";

type TabId = "context" | "files" | "timeline" | "analysis" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "context", label: "Context", icon: "📋" },
  { id: "files", label: "Files", icon: "📁" },
  { id: "timeline", label: "Timeline", icon: "🕐" },
  { id: "analysis", label: "Analysis", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("context");

  // Data state
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [filesData, setFilesData] = useState<InfluenceResult[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineEvent[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [settingsData, setSettingsData] = useState<Settings | null>(null);
  const [rulesData, setRulesData] = useState<ProjectRule[]>([]);

  // Handle messages from the extension host
  const handleMessage = useCallback((event: MessageEvent) => {
    const message = event.data;
    switch (message.type) {
      case "contextData":
        setContextData(message.payload);
        break;
      case "filesData":
        setFilesData(message.payload.influential);
        break;
      case "timelineData":
        setTimelineData(message.payload.events);
        break;
      case "analysisData":
        setAnalysisData(message.payload);
        break;
      case "settingsData":
        setSettingsData(message.payload);
        break;
      case "rulesData":
        setRulesData(message.payload.rules);
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    // Signal to the extension that the webview is ready
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Request data when switching tabs
  useEffect(() => {
    const messageTypes: Record<TabId, string> = {
      context: "getContext",
      files: "getFiles",
      timeline: "getTimeline",
      analysis: "getAnalysis",
      settings: "getSettings",
    };
    vscode.postMessage({ type: messageTypes[activeTab] });
    if (activeTab === "settings") {
      vscode.postMessage({ type: "getRules" });
    }
  }, [activeTab]);

  return (
    <div className="app">
      {/* Tab Bar */}
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

      {/* Panel Content */}
      <div className="app-content">
        {activeTab === "context" && <ContextPanel data={contextData} />}
        {activeTab === "files" && <FilesPanel data={filesData} />}
        {activeTab === "timeline" && <TimelinePanel data={timelineData} />}
        {activeTab === "analysis" && <AnalysisPanel data={analysisData} />}
        {activeTab === "settings" && (
          <SettingsPanel settings={settingsData} rules={rulesData} />
        )}
      </div>
    </div>
  );
}
