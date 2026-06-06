param(
    [string]$Branch = "ios-style-dashboard-updates",
    [string]$PrBase = "main",
    [string]$PrTitle = "",
    [string]$PrBody = "",
    [string]$Message = "Codex finish upload",
    [switch]$SkipBuild,
    [switch]$PushMain,
    [switch]$SkipPullRequest,
    [switch]$SkipAutoMerge
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

function Test-GitRef {
    param(
        [string]$Ref
    )

    git rev-parse --verify --quiet $Ref 1>$null
    return $LASTEXITCODE -eq 0
}

function Invoke-Pnpm {
    corepack pnpm @args
    if ($LASTEXITCODE -ne 0) {
        throw "corepack pnpm $args failed with exit code $LASTEXITCODE"
    }
}

function Get-GitHubRepositorySlug {
    $remoteUrl = git remote get-url origin
    if ($LASTEXITCODE -ne 0) {
        throw "git remote get-url origin failed with exit code $LASTEXITCODE"
    }

    if ($remoteUrl -match "github\.com[:/](?<slug>[^/]+/[^/.]+)(\.git)?$") {
        return $Matches.slug
    }

    return ""
}

function Get-GitHubBranchUrl {
    param(
        [string]$RepositorySlug,
        [string]$BranchName
    )

    if (-not $RepositorySlug) {
        return ""
    }

    return "https://github.com/$RepositorySlug/tree/$BranchName"
}

function Invoke-Gh {
    param(
        [string[]]$Arguments
    )

    $ghPath = "C:\Program Files\GitHub CLI\gh.exe"
    if (-not (Test-Path $ghPath)) {
        $gh = Get-Command gh -ErrorAction SilentlyContinue
        if ($gh) {
            $ghPath = $gh.Path
        }
    }

    if (-not (Test-Path $ghPath)) {
        return @{
            Ok = $false
            Output = "GitHub CLI is not installed or not on PATH."
        }
    }

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $ghPath @Arguments 2>&1
        $ok = $LASTEXITCODE -eq 0
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    return @{
        Ok = $ok
        Output = ($output -join [Environment]::NewLine)
    }
}

function Invoke-PullRequestAutomation {
    param(
        [string]$RepositorySlug,
        [string]$HeadBranch,
        [string]$BaseBranch
    )

    if ($PushMain -or $SkipPullRequest) {
        Write-Host "Pull request automation skipped."
        return
    }

    if (-not $RepositorySlug) {
        Write-Host "Could not derive GitHub repository from origin remote."
        return
    }

    $title = $PrTitle
    if (-not $title) {
        $title = $Message
    }

    $body = $PrBody
    if (-not $body) {
        $body = @"
## Summary

- Upload Codex-finished zashboard changes.
- Run dependency install, type-check, and production build before pushing.
- Keep local workspace/tooling files excluded from the repository.

## Verification

- corepack pnpm install --frozen-lockfile
- corepack pnpm type-check
- corepack pnpm build
"@
    }

    $viewResult = Invoke-Gh -Arguments @(
        "pr", "view", $HeadBranch,
        "--repo", $RepositorySlug,
        "--json", "url",
        "--jq", ".url"
    )

    if ($viewResult.Ok -and $viewResult.Output.Trim()) {
        $prUrl = $viewResult.Output.Trim()
        Write-Host "Existing pull request: $prUrl"
    } else {
        $createResult = Invoke-Gh -Arguments @(
            "pr", "create",
            "--repo", $RepositorySlug,
            "--base", $BaseBranch,
            "--head", $HeadBranch,
            "--title", $title,
            "--body", $body
        )

        if (-not $createResult.Ok) {
            Write-Host "Could not create pull request automatically."
            Write-Host $createResult.Output
            Write-Host "Manual pull request URL: https://github.com/$RepositorySlug/pull/new/$HeadBranch"
            return
        }

        $prUrl = $createResult.Output.Trim()
        Write-Host "Created pull request: $prUrl"
    }

    if ($SkipAutoMerge) {
        Write-Host "Auto-merge skipped."
        return
    }

    $mergeResult = Invoke-Gh -Arguments @(
        "pr", "merge", $prUrl,
        "--auto",
        "--squash"
    )

    if ($mergeResult.Ok) {
        Write-Host "Auto-merge requested for: $prUrl"
    } else {
        Write-Host "Could not enable auto-merge automatically."
        Write-Host $mergeResult.Output
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

if (-not $PushMain) {
    Invoke-Step "Sync upload branch" {
        git fetch origin "$Branch`:refs/remotes/origin/$Branch"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Remote upload branch does not exist yet or could not be fetched."
            return
        }

        $remoteRef = "origin/$Branch"
        if (Test-GitRef $remoteRef) {
            Invoke-Git rebase $remoteRef
        }
    }
}

Invoke-Step "Push" {
    if ($PushMain) {
        Invoke-Git push origin main
    } else {
        Invoke-Git push -u origin HEAD:$Branch
    }
}

Invoke-Step "Pull request and auto-merge" {
    $repositorySlug = Get-GitHubRepositorySlug
    Invoke-PullRequestAutomation -RepositorySlug $repositorySlug -HeadBranch $Branch -BaseBranch $PrBase

    if (-not (Test-Path "C:\Program Files\GitHub CLI\gh.exe") -and -not (Get-Command gh -ErrorAction SilentlyContinue)) {
        $branchUrl = Get-GitHubBranchUrl -RepositorySlug $repositorySlug -BranchName $Branch
        if ($branchUrl) {
            Write-Host "Pushed branch: $branchUrl"
        }
    }
}

Write-Host ""
Write-Host "Done."
