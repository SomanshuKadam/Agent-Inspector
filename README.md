# AI Context Inspector

AI Context Inspector is a VS Code extension for understanding how local AI coding sessions are assembled. It reads supported agent traces and presents the session as a searchable decision trace instead of a stream of opaque log records.

## What it provides

- **Decision Trace** - a chronological feed of user requests, memory loads, file reads, tool calls, commands, and final responses.
- **Session summary** - the active platform, event count, file reads, tool calls, commands, and memory loads at a glance.
- **Raw Data viewer** - inspect the source JSON record behind any normalized event.
- **Local adapters** - separate readers for Claude Code, Antigravity, and GitHub Copilot trace data.
- **Configurable polling** - enable or disable automatic detection and choose the refresh interval from the Settings tab. Changes apply the next time the extension activates.

## Supported sources

| Source | Input | Default location or endpoint |
| --- | --- | --- |
| Claude Code | JSONL session logs | `~/.claude/projects/` |
| Antigravity | JSONL session transcript | `~/.gemini/antigravity-ide/brain/<session>/.system_generated/logs/transcript.jsonl` |
| GitHub Copilot | OTLP JSON traces | `http://127.0.0.1:4318/v1/traces` |

The file adapters follow the newest matching session. The Copilot adapter accepts OTLP JSON over the loopback interface; protobuf payloads are currently reported but not decoded.

## Requirements

- VS Code 1.85 or later
- Node.js 18 or later for development and packaging

## Development

```bash
npm install
cd webview-ui && npm install && cd ..
npm run lint
npm run compile
```

Press `F5` in VS Code to launch the extension in an Extension Development Host. The compiled extension bundle is written to `dist/`, and the webview bundle is written to `webview-ui/dist/`.

## Packaging

Create an installable VSIX from the repository root:

```bash
npm run package
```

Install the generated file in VS Code with **Extensions: Install from VSIX...**.

## Privacy and data handling

- Trace files are read locally and are not uploaded by the extension.
- The Copilot receiver binds to `127.0.0.1` only.
- No telemetry or external API calls are made by the extension.
- Parsed events are retained in memory for the current extension activation; they are not persisted by the current implementation.

## Project layout

```text
src/
  adapters/       Agent-specific trace readers
  providers/      VS Code webview integration
webview-ui/src/   React-based sidebar interface
media/            Activity Bar assets
resources/        Extension package assets
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
