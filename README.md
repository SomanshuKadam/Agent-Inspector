# AI Context Inspector

> DevTools for AI Coding Agents — understand what context influenced your AI assistant's response.

## Features

### 📋 Context Panel
See what's currently visible to your AI assistant:
- Open files with token estimates
- Recently edited files
- Context utilization ring with percentage
- Model-specific context window limits

### 📁 File Influence Panel
Understand which files are most likely influencing AI interactions:
- Heuristic-based influence scoring (High/Medium/Low)
- **"Why Did It Say This?"** — percentage breakdown of file influence
- Influence factors: recency, edit frequency, rule mentions

### 🕐 Context Timeline
Track context changes over time:
- Chronological event log (file opens, edits, closes)
- AI interaction detection
- Grouped by date with color-coded event types

### 📊 Context Size Analyzer
Prevent context overload:
- Token breakdown by category (open files, recent files, metadata)
- Visual stacked bar chart
- Configurable warning thresholds
- Alerts when approaching model limits

### 📜 Project Rules
Surface persistent project instructions:
- Add, edit, delete project rules
- Toggle rules on/off
- Rules influence file scoring calculations

### ⚙️ Settings
Configurable:
- Token estimation model (GPT-4, Claude 3, Gemini Pro, etc.)
- Context warning threshold (default: 80%)
- History retention period (default: 30 days)
- Timeline retention period (default: 30 days)

## Supported AI Assistants

- Claude Code
- Continue.dev
- Generic file/context tracking

## Privacy

- **No external API calls** — everything runs locally
- **No telemetry** — zero data collection
- **No cloud uploads** — your data stays on your machine
- **Works offline** — no internet required

## Installation

1. Download the `.vsix` file from Releases
2. In VS Code, press `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the downloaded `.vsix` file
4. Click the AI Context Inspector icon in the Activity Bar

## Requirements

- VS Code 1.85.0 or later

## Data Storage

All data is stored locally in your workspace:
```
.vscode/ai-context-inspector/
├── timeline.json
├── rules.json
└── settings.json
```

## License

MIT
