param(
    [string]$Branch = "ios-style-dashboard-updates",
    [string]$Message = "Codex finish upload",
    [switch]$SkipBuild,
    [switch]$PushMain
)

$ErrorActionPreference = "Stop"

$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repo

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    & $Command
}

function Invoke-Git {
    git @args
    if ($LASTEXITCODE -ne 0) {
        throw "git $args failed with exit code $LASTEXITCODE"
    }
}

function Invoke-Pnpm {
    corepack pnpm @args
    if ($LASTEXITCODE -ne 0) {
        throw "corepack pnpm $args failed with exit code $LASTEXITCODE"
    }
}

$excludedPaths = @(
    ".agents",
    "skills-lock.json",
    "WORKSPACE-NOTE.md"
)

Invoke-Step "Repository" {
    Invoke-Git rev-parse --show-toplevel
    Invoke-Git status --branch --short
}

Invoke-Step "Stage recommended files" {
    Invoke-Git add -- .gitignore AGENTS.md CHANGELOG.md README.md eslint.config.js package.json pnpm-lock.yaml vite.config.ts src scripts WEBUI-PERFORMANCE-EVIDENCE.md

    foreach ($path in $excludedPaths) {
        Invoke-Git reset -- $path 2>$null
    }
}

Invoke-Step "Verify excluded paths are not staged" {
    $staged = @(git diff --cached --name-only)
    $bad = @(
        $staged | Where-Object {
            $_ -eq "skills-lock.json" -or
            $_ -eq "WORKSPACE-NOTE.md" -or
            $_ -like ".agents/*"
        }
    )

    if ($bad.Count -gt 0) {
        $bad | ForEach-Object { Write-Host "Unexpected staged path: $_" }
        throw "Excluded paths are staged."
    }

    Write-Host "Excluded paths are clean."
}

Invoke-Step "Install dependencies" {
    Invoke-Pnpm install --frozen-lockfile
}

Invoke-Step "Type check" {
    Invoke-Pnpm type-check
}

if (-not $SkipBuild) {
    Invoke-Step "Build" {
        Invoke-Pnpm build
    }
}

$stagedCount = @(git diff --cached --name-only).Count
if ($stagedCount -gt 0) {
    Invoke-Step "Commit $stagedCount staged files" {
        Invoke-Git commit -m $Message
    }
} else {
    Write-Host ""
    Write-Host "==> Commit"
    Write-Host "No staged changes to commit."
}

Invoke-Step "Push" {
    if ($PushMain) {
        Invoke-Git push origin main
    } else {
        Invoke-Git push -u origin HEAD:$Branch
    }
}

Write-Host ""
Write-Host "Done."
