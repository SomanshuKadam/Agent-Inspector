import React, { useState } from "react";
import { TraceEvent } from "../types";

interface RawDataPanelProps {
  event: TraceEvent | null;
}

const JsonViewer = ({ data, name = "root" }: { data: any; name?: string }) => {
  const [open, setOpen] = useState(true);

  if (data === null) {
    return <span><span className="json-key">{name}</span>: <span className="json-string">null</span></span>;
  }

  if (typeof data === "string") {
    return <span><span className="json-key">{name}</span>: <span className="json-string">"{data}"</span></span>;
  }

  if (typeof data === "number") {
    return <span><span className="json-key">{name}</span>: <span className="json-number">{data}</span></span>;
  }

  if (typeof data === "boolean") {
    return <span><span className="json-key">{name}</span>: <span className="json-boolean">{data ? "true" : "false"}</span></span>;
  }

  if (Array.isArray(data)) {
    return (
      <details open={open} className="json-details">
        <summary className="json-summary" onClick={(e) => { e.preventDefault(); setOpen(!open); }}>
          <span className="json-key">{name}</span>: Array({data.length}) {open ? "[" : "[...]"}
        </summary>
        {open && (
          <div style={{ marginLeft: "12px", borderLeft: "1px dashed rgba(128,128,128,0.3)", paddingLeft: "8px" }}>
            {data.map((item, i) => (
              <div key={i}><JsonViewer data={item} name={i.toString()} /></div>
            ))}
          </div>
        )}
        {open && <div>]</div>}
      </details>
    );
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    return (
      <details open={open} className="json-details">
        <summary className="json-summary" onClick={(e) => { e.preventDefault(); setOpen(!open); }}>
          <span className="json-key">{name}</span>: {"{...}"}
        </summary>
        {open && (
          <div style={{ marginLeft: "12px", borderLeft: "1px dashed rgba(128,128,128,0.3)", paddingLeft: "8px" }}>
            {keys.map((k) => (
              <div key={k}><JsonViewer data={data[k]} name={k} /></div>
            ))}
          </div>
        )}
      </details>
    );
  }

  return <span>{String(data)}</span>;
};

export function RawDataPanel({ event }: RawDataPanelProps) {
  if (!event) {
    return (
      <div className="panel empty-state">
        <p>Select an event from the Decision Trace to view its raw data.</p>
      </div>
    );
  }

  let parsed = null;
  try {
    parsed = JSON.parse(event.sourceRecord);
  } catch (e) {
    parsed = event.sourceRecord;
  }

  return (
    <div className="panel raw-data">
      <h3>Raw Data for Event</h3>
      <div className="raw-content-container" style={{ fontFamily: "var(--vscode-editor-font-family, monospace)", fontSize: "12px", marginTop: "12px" }}>
        <JsonViewer data={parsed} />
      </div>
    </div>
  );
}
