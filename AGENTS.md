# zashboard Codex Rules

## Workspace

Use this repository as-is. Do not reorganize the source tree into `work` and `outputs` unless explicitly requested.

## Finish Upload

At the end of a Codex work session for this project, default to running:

```powershell
D:\CodexWorkspace\projects\zashboard\scripts\codex-finish-upload.ps1
```

This script stages recommended project files, excludes local Codex/workspace files, runs checks, commits changes when needed, and pushes to `ios-style-dashboard-updates`.

Do not run the finish upload script if the user explicitly asks not to upload, only wants analysis, or the current task is intentionally incomplete.

## Excluded Local Files

Do not stage or commit these unless the user explicitly asks:

```text
.agents/
skills-lock.json
WORKSPACE-NOTE.md
```
