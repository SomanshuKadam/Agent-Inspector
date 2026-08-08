import * as http from 'http';
import { IAgentAdapter, TraceEvent, ActionType } from './types';

export class CopilotAdapter implements IAgentAdapter {
  platformName = 'GitHub Copilot';
  private events: TraceEvent[] = [];
  private server?: http.Server;
  private onUpdateCallback?: () => void;
  private port = 4318;

  async startWatching(onUpdate: () => void, _refreshIntervalMs?: number): Promise<void> {
    this.onUpdateCallback = onUpdate;
    this.startServer();
  }

  stopWatching(): void {
    if (this.server) {
      this.server.close();
      this.server = undefined;
    }
  }

  getTraceEvents(): TraceEvent[] {
    return this.events;
  }

  private startServer() {
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/v1/traces') {
        let body: Buffer[] = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
          const payload = Buffer.concat(body);
          this.handleTracePayload(req.headers['content-type'], payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({}));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.server.on('error', (err) => {
      console.error('[CopilotAdapter] Server error:', err);
    });

    this.server.listen(this.port, '127.0.0.1', () => {
      console.log(`[CopilotAdapter] Listening for OTLP traces on http://127.0.0.1:${this.port}/v1/traces`);
    });
  }

  private handleTracePayload(contentType: string | undefined, payload: Buffer) {
    try {
      if (contentType?.includes('application/json')) {
        const data = JSON.parse(payload.toString('utf8'));
        this.processOtlpJson(data);
      } else if (contentType?.includes('application/x-protobuf')) {
        // Log that we need JSON for now
        console.warn('[CopilotAdapter] Received protobuf payload. Please configure exporterType to JSON if possible.');
      } else {
        // Try JSON anyway
        const data = JSON.parse(payload.toString('utf8'));
        this.processOtlpJson(data);
      }
    } catch (e) {
      console.error('[CopilotAdapter] Failed to parse payload:', e);
    }
  }

  private processOtlpJson(data: any) {
    if (!data || !data.resourceSpans) return;

    let updated = false;

    for (const rs of data.resourceSpans) {
      for (const ss of rs.scopeSpans || []) {
        for (const span of ss.spans || []) {
          const event = this.mapSpanToEvent(span);
          if (event) {
            this.events.push(event);
            updated = true;
          }
        }
      }
    }

    if (updated && this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  private mapSpanToEvent(span: any): TraceEvent | null {
    const name = (span.name || '').toLowerCase();
    const attrs = this.extractAttributes(span.attributes || []);

    let actionType: ActionType = 'UNKNOWN';
    let summary = 'Copilot Action';
    let entity = undefined;

    // Detect USER_REQUEST
    if (name === 'chat.request' || attrs['gen_ai.prompt']) {
      actionType = 'USER_REQUEST';
      summary = (attrs['gen_ai.prompt'] || attrs['message'] || 'User Request').substring(0, 120);
    }
    // Detect FINAL_RESPONSE
    else if (name === 'chat.response' || attrs['gen_ai.completion']) {
      actionType = 'FINAL_RESPONSE';
      summary = (attrs['gen_ai.completion'] || 'Agent Response').substring(0, 120);
    }
    // Detect FILE_READ
    else if (name.includes('readfile') || attrs['file.path'] || attrs['uri']) {
      actionType = 'FILE_READ';
      entity = attrs['file.path'] || attrs['uri'] || 'file';
      const cleanFile = entity.split(/[\\/]/).pop();
      summary = `Read:\n${cleanFile}`;
    }
    // Detect COMMAND_EXECUTED
    else if (name.includes('terminal.execute') || attrs['command.line']) {
      actionType = 'COMMAND_EXECUTED';
      const cmd = attrs['command.line'] || 'command';
      summary = `Executed:\n${cmd.substring(0, 60)}`;
    }
    // Detect TOOL_CALL
    else if (name.includes('tool.execution') || name.includes('agent.tool') || attrs['tool.name']) {
      actionType = 'TOOL_CALL';
      entity = attrs['tool.name'] || name;
      summary = `Tool:\n${entity}`;
    } else {
      return null;
    }

    // Convert nanoseconds to timestamp
    let timestamp = new Date().toISOString();
    if (span.startTimeUnixNano) {
      const ms = parseInt(span.startTimeUnixNano) / 1000000;
      timestamp = new Date(ms).toISOString();
    }

    return {
      id: span.spanId || Math.random().toString(36).substring(7),
      timestamp,
      platform: 'GitHub Copilot',
      actionType,
      entity,
      summary,
      sourceRecord: JSON.stringify(span)
    };
  }

  private extractAttributes(attributes: any[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const attr of attributes) {
      if (!attr.key || !attr.value) continue;
      // Extract string value, or int value etc.
      const val = attr.value.stringValue || attr.value.intValue || attr.value.boolValue || '';
      result[attr.key] = String(val);
    }
    return result;
  }
}
