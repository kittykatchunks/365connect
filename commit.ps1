# Git Commit Helper Script
# Usage: .\commit.ps1 [options]
# Examples:
#   .\commit.ps1                    # Interactive mode
#   .\commit.ps1 -m "message"       # Quick commit with message
#   .\commit.ps1 -NoPush            # Commit without pushing
#   .\commit.ps1 -Type feat         # Use conventional commit type

param(
    [Alias("m")]
    [string]$Message,
    
    [Alias("t")]
    [ValidateSet("feat", "fix", "docs", "style", "refactor", "test", "chore", "perf", "ci", "build")]
    [string]$Type,
    
    [Alias("b")]
    [string]$Branch,
    
    [switch]$NoPush,
    
    [switch]$Help
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Red = "Red"
$Magenta = "Magenta"

# Show help
if ($Help) {
    Write-Host "`n📖 Git Commit Helper" -ForegroundColor $Cyan
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor $Cyan
    Write-Host "Usage: .\commit.ps1 [options]`n" -ForegroundColor $Yellow
    Write-Host "Options:" -ForegroundColor $Green
    Write-Host "  -m, -Message    Commit message"
    Write-Host "  -t, -Type       Conventional commit type (feat, fix, docs, etc.)"
    Write-Host "  -b, -Branch     Switch to branch before committing"
    Write-Host "  -NoPush         Commit only, don't push"
    Write-Host "  -Help           Show this help`n"
    Write-Host "Conventional Commit Types:" -ForegroundColor $Green
    Write-Host "  feat      New feature"
    Write-Host "  fix       Bug fix"
    Write-Host "  docs      Documentation changes"
    Write-Host "  style     Code style (formatting, semicolons, etc.)"
    Write-Host "  refactor  Code refactoring"
    Write-Host "  test      Adding or updating tests"
    Write-Host "  chore     Maintenance tasks"
    Write-Host "  perf      Performance improvements"
    Write-Host "  ci        CI/CD changes"
    Write-Host "  build     Build system changes`n"
    exit 0
}

# Show current branch
$currentBranch = git branch --show-current
Write-Host "`n🌿 Current Branch: " -ForegroundColor $Cyan -NoNewline
Write-Host $currentBranch -ForegroundColor $Green

# Branch switching
if ($Branch) {
    Write-Host "🔀 Switching to branch: $Branch" -ForegroundColor $Cyan
    git checkout $Branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Creating new branch: $Branch" -ForegroundColor $Yellow
        git checkout -b $Branch
    }
    $currentBranch = $Branch
}

# Show current git status
Write-Host "`n📋 Current Git Status:" -ForegroundColor $Cyan
Write-Host "─────────────────────────────────────" -ForegroundColor $Cyan
git status --short

# Check if there are any changes
$changes = git status --porcelain
if (-not $changes) {
    Write-Host "`n✅ No changes to commit!" -ForegroundColor $Green
    exit 0
}

Write-Host "`n─────────────────────────────────────" -ForegroundColor $Cyan

# If no type provided, offer selection
if (-not $Type -and -not $Message) {
    Write-Host "`n🏷️  Select commit type (or press Enter to skip):" -ForegroundColor $Yellow
    Write-Host "   1) feat     - New feature" -ForegroundColor $Magenta
    Write-Host "   2) fix      - Bug fix" -ForegroundColor $Magenta
    Write-Host "   3) docs     - Documentation" -ForegroundColor $Magenta
    Write-Host "   4) style    - Code style" -ForegroundColor $Magenta
    Write-Host "   5) refactor - Refactoring" -ForegroundColor $Magenta
    Write-Host "   6) test     - Tests" -ForegroundColor $Magenta
    Write-Host "   7) chore    - Maintenance" -ForegroundColor $Magenta
    Write-Host "   8) perf     - Performance" -ForegroundColor $Magenta
    Write-Host "   9) ci       - CI/CD" -ForegroundColor $Magenta
    Write-Host "   0) build    - Build system" -ForegroundColor $Magenta
    
    $typeChoice = Read-Host "`nChoice (1-9, 0, or Enter to skip)"
    
    $typeMap = @{
        "1" = "feat"
        "2" = "fix"
        "3" = "docs"
        "4" = "style"
        "5" = "refactor"
        "6" = "test"
        "7" = "chore"
        "8" = "perf"
        "9" = "ci"
        "0" = "build"
    }
    
    if ($typeMap.ContainsKey($typeChoice)) {
        $Type = $typeMap[$typeChoice]
        Write-Host "   Selected: $Type" -ForegroundColor $Green
    }
}

# If no message provided, prompt for one
if (-not $Message) {
    Write-Host "`n📝 Enter commit message (or 'q' to cancel):" -ForegroundColor $Yellow
    $Message = Read-Host ">"
    
    if ($Message -eq 'q' -or $Message -eq '') {
        Write-Host "`n❌ Commit cancelled." -ForegroundColor $Red
        exit 1
    }
}

# Build final commit message with conventional commit format
$finalMessage = if ($Type) { "${Type}: $Message" } else { $Message }

# Determine push action text
$pushAction = if ($NoPush) { "commit only (no push)" } else { "commit and push" }

# Confirm before committing
Write-Host "`n🔍 Commit Preview:" -ForegroundColor $Cyan
Write-Host "   Branch:  $currentBranch" -ForegroundColor $Yellow
Write-Host "   Message: $finalMessage" -ForegroundColor $Yellow
Write-Host "   Action:  $pushAction" -ForegroundColor $Yellow
Write-Host "`nProceed? (Y/n): " -ForegroundColor $Yellow -NoNewline
$confirm = Read-Host

if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Host "`n❌ Commit cancelled." -ForegroundColor $Red
    exit 1
}

# Stage all changes
Write-Host "`n📦 Staging all changes..." -ForegroundColor $Cyan
git add -A

# Commit with message
Write-Host "💾 Committing..." -ForegroundColor $Cyan
git commit -m $finalMessage

if ($LASTEXITCODE -eq 0) {
    if (-not $NoPush) {
        # Push to remote
        Write-Host "🚀 Pushing to remote..." -ForegroundColor $Cyan
        git push
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Successfully committed and pushed!" -ForegroundColor $Green
        } else {
            # Try setting upstream if push fails
            Write-Host "   Setting upstream branch..." -ForegroundColor $Yellow
            git push --set-upstream origin $currentBranch
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ Successfully committed and pushed!" -ForegroundColor $Green
            } else {
                Write-Host "`n⚠️ Commit successful but push failed." -ForegroundColor $Yellow
            }
        }
    } else {
        Write-Host "`n✅ Successfully committed! (push skipped)" -ForegroundColor $Green
    }
} else {
    Write-Host "`n❌ Commit failed." -ForegroundColor $Red
}
