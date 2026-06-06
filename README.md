# Name
### zashboard

# Synopsis
A Dashboard Using Clash API

# Description

# Example

# Install:
`npm install zashboard`

# Test:
`npm test`

#License:
MIT

# Codex finish upload

Use the Codex finish upload script when a Codex work session for this project is complete.

```powershell
D:\CodexWorkspace\projects\zashboard\scripts\codex-finish-upload.ps1
```

The script stages recommended project files, excludes local Codex/workspace files, runs checks, commits changes when needed, and pushes to:

```text
ios-style-dashboard-updates
```

Excluded from automatic staging:

```text
.agents/
skills-lock.json
WORKSPACE-NOTE.md
```

Common options:

```powershell
# Custom commit message
D:\CodexWorkspace\projects\zashboard\scripts\codex-finish-upload.ps1 -Message "Update zashboard UI"

# Skip production build, but still run install and type-check
D:\CodexWorkspace\projects\zashboard\scripts\codex-finish-upload.ps1 -SkipBuild

# Push main directly only when main is intentionally synchronized
D:\CodexWorkspace\projects\zashboard\scripts\codex-finish-upload.ps1 -PushMain
```
