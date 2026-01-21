# Git Commit Helper Script with Semantic Versioning
# Usage: .\commit.ps1 [options]
# Examples:
#   .\commit.ps1                    # Interactive mode (auto patch bump)
#   .\commit.ps1 -m "message"       # Quick commit with message
#   .\commit.ps1 -NoPush            # Commit without pushing
#   .\commit.ps1 -Type feat         # Use conventional commit type
#   .\commit.ps1 -Minor             # Bump minor version (0.2.x → 0.3.0)
#   .\commit.ps1 -Major             # Bump major version (0.x.x → 1.0.0)
#   .\commit.ps1 -PreRelease alpha  # Create pre-release (0.2.15-alpha.1)
#   .\commit.ps1 -Release           # Promote to release (0.2.15-alpha.1 → 0.2.15)

param(
    [Alias("m")]
    [string]$Message,
    
    [Alias("t")]
    [ValidateSet("feat", "fix", "docs", "style", "refactor", "test", "chore", "perf", "ci", "build")]
    [string]$Type,
    
    [Alias("b")]
    [string]$Branch,
    
    [switch]$NoPush,
    
    [switch]$Help,
    
    # Version bump options
    [switch]$Major,           # Bump major version (breaking changes)
    [switch]$Minor,           # Bump minor version (new features)
    [switch]$Patch,           # Bump patch version (bug fixes) - default
    [switch]$NoVersion,       # Skip version bump
    [switch]$Release,         # Promote pre-release to release
    
    [ValidateSet("alpha", "beta", "rc")]
    [string]$PreRelease       # Create pre-release version
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Red = "Red"
$Magenta = "Magenta"

# Version file paths
$versionFile = "VERSION"
$versionTsFile = "src\utils\version.ts"

# Function to read current version
function Get-CurrentVersion {
    if (Test-Path $versionFile) {
        return (Get-Content $versionFile -Raw).Trim()
    }
    return "0.1.0"
}

# Function to parse semantic version
function Parse-Version {
    param([string]$version)
    
    $pattern = '^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z]+)\.(\d+))?$'
    if ($version -match $pattern) {
        return @{
            Major = [int]$Matches[1]
            Minor = [int]$Matches[2]
            Patch = [int]$Matches[3]
            PreReleaseType = $Matches[4]
            PreReleaseNumber = if ($Matches[5]) { [int]$Matches[5] } else { 0 }
        }
    }
    throw "Invalid version format: $version"
}

# Function to bump version
function Update-Version {
    param(
        [hashtable]$current,
        [switch]$major,
        [switch]$minor,
        [switch]$patch,
        [string]$preRelease,
        [switch]$release
    )
    
    $new = @{
        Major = $current.Major
        Minor = $current.Minor
        Patch = $current.Patch
        PreReleaseType = $null
        PreReleaseNumber = 0
    }
    
    if ($release) {
        # Promote pre-release to release (remove pre-release suffix)
        if (-not $current.PreReleaseType) {
            throw "Current version is not a pre-release"
        }
        # Keep version numbers, just remove pre-release
    }
    elseif ($preRelease) {
        # Add or increment pre-release
        if ($current.PreReleaseType -eq $preRelease) {
            # Increment existing pre-release number
            $new.PreReleaseType = $preRelease
            $new.PreReleaseNumber = $current.PreReleaseNumber + 1
        }
        else {
            # New pre-release type or first pre-release
            if ($major) {
                $new.Major = $current.Major + 1
                $new.Minor = 0
                $new.Patch = 0
            }
            elseif ($minor) {
                $new.Minor = $current.Minor + 1
                $new.Patch = 0
            }
            else {
                # Default to patch bump for pre-release
                $new.Patch = $current.Patch + 1
            }
            $new.PreReleaseType = $preRelease
            $new.PreReleaseNumber = 1
        }
    }
    else {
        # Standard version bump (remove any pre-release)
        if ($major) {
            $new.Major = $current.Major + 1
            $new.Minor = 0
            $new.Patch = 0
        }
        elseif ($minor) {
            $new.Minor = $current.Minor + 1
            $new.Patch = 0
        }
        else {
            # Default: patch bump
            $new.Patch = $current.Patch + 1
        }
    }
    
    # Format version string
    $versionStr = "$($new.Major).$($new.Minor).$($new.Patch)"
    if ($new.PreReleaseType) {
        $versionStr += "-$($new.PreReleaseType).$($new.PreReleaseNumber)"
    }
    
    return $versionStr
}

# Function to save version
function Set-Version {
    param([string]$version)
    
    # Update VERSION file
    $version | Out-File -FilePath $versionFile -NoNewline -Encoding utf8
    Write-Host "   Updated VERSION file: $version" -ForegroundColor $Green
    
    # Update version.ts file if it exists
    if (Test-Path $versionTsFile) {
        $content = Get-Content $versionTsFile -Raw
        
        # Match the CURRENT_VERSION constant line
        $pattern = "(const\s+CURRENT_VERSION\s*=\s*')[^']+(';\s*//.*)"
        $replacement = "`${1}$version`$2"
        
        $newContent = $content -replace $pattern, $replacement
        
        if ($newContent -ne $content) {
            $newContent | Out-File -FilePath $versionTsFile -NoNewline -Encoding utf8
            Write-Host "   Updated version.ts: $version" -ForegroundColor $Green
        } else {
            Write-Host "   ⚠️ Could not update version.ts automatically" -ForegroundColor $Yellow
        }
    }
}


# Show help
if ($Help) {
    Write-Host "`n📖 Git Commit Helper with Semantic Versioning" -ForegroundColor $Cyan
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor $Cyan
    Write-Host "Usage: .\commit.ps1 [options]`n" -ForegroundColor $Yellow
    Write-Host "Basic Options:" -ForegroundColor $Green
    Write-Host "  -m, -Message    Commit message"
    Write-Host "  -t, -Type       Conventional commit type (feat, fix, docs, etc.)"
    Write-Host "  -b, -Branch     Switch to branch before committing"
    Write-Host "  -NoPush         Commit only, don't push"
    Write-Host "  -Help           Show this help`n"
    Write-Host "Version Bump Options (Semantic Versioning):" -ForegroundColor $Green
    Write-Host "  -Major          Bump major version (1.0.0 → 2.0.0) - Breaking changes"
    Write-Host "  -Minor          Bump minor version (0.2.0 → 0.3.0) - New features"
    Write-Host "  -Patch          Bump patch version (0.2.14 → 0.2.15) - Bug fixes [DEFAULT]"
    Write-Host "  -PreRelease     Create pre-release (alpha, beta, rc)"
    Write-Host "                  Example: -PreRelease alpha → 0.2.15-alpha.1"
    Write-Host "  -Release        Promote pre-release to stable release"
    Write-Host "                  Example: 0.2.15-alpha.1 → 0.2.15"
    Write-Host "  -NoVersion      Skip version bumping`n"
    Write-Host "Conventional Commit Types:" -ForegroundColor $Green
    Write-Host "  feat      New feature (suggests -Minor)"
    Write-Host "  fix       Bug fix (suggests -Patch)"
    Write-Host "  docs      Documentation changes"
    Write-Host "  style     Code style (formatting, semicolons, etc.)"
    Write-Host "  refactor  Code refactoring"
    Write-Host "  test      Adding or updating tests"
    Write-Host "  chore     Maintenance tasks"
    Write-Host "  perf      Performance improvements"
    Write-Host "  ci        CI/CD changes"
    Write-Host "  build     Build system changes`n"
    Write-Host "Examples:" -ForegroundColor $Green
    Write-Host "  .\commit.ps1 -m 'Fixed login bug'           # Patch bump (0.2.14 → 0.2.15)"
    Write-Host "  .\commit.ps1 -Minor -m 'Added chat feature' # Minor bump (0.2.15 → 0.3.0)"
    Write-Host "  .\commit.ps1 -Major -m 'Complete rewrite'   # Major bump (0.3.0 → 1.0.0)"
    Write-Host "  .\commit.ps1 -PreRelease alpha              # Pre-release (0.2.15-alpha.1)"
    Write-Host "  .\commit.ps1 -Release -m 'Release v1.0.0'   # Promote to release`n"
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

# Handle version bumping
$currentVersion = Get-CurrentVersion
$parsedVersion = Parse-Version $currentVersion
Write-Host "`n📦 Current Version: $currentVersion" -ForegroundColor $Cyan

$newVersion = $null
$versionBumpType = "Patch (default)"

# Interactive version selection if no flags provided
if (-not $NoVersion -and -not $Major -and -not $Minor -and -not $Patch -and -not $PreRelease -and -not $Release) {
    Write-Host "`n🔢 Select version bump:" -ForegroundColor $Yellow
    Write-Host "   1) Patch  - Bug fixes, minor changes (default) [$($parsedVersion.Major).$($parsedVersion.Minor).$($parsedVersion.Patch + 1)]" -ForegroundColor $Magenta
    Write-Host "   2) Minor  - New features, non-breaking changes [$($parsedVersion.Major).$($parsedVersion.Minor + 1).0]" -ForegroundColor $Magenta
    Write-Host "   3) Major  - Breaking changes [$($parsedVersion.Major + 1).0.0]" -ForegroundColor $Magenta
    Write-Host "   4) Alpha  - Alpha pre-release" -ForegroundColor $Magenta
    Write-Host "   5) Beta   - Beta pre-release" -ForegroundColor $Magenta
    Write-Host "   6) RC     - Release Candidate" -ForegroundColor $Magenta
    if ($parsedVersion.PreReleaseType) {
        Write-Host "   7) Release - Promote to stable release [$($parsedVersion.Major).$($parsedVersion.Minor).$($parsedVersion.Patch)]" -ForegroundColor $Magenta
    }
    Write-Host "   0) None   - Skip version bump" -ForegroundColor $Magenta
    
    $versionChoice = Read-Host "`nChoice (1-7, 0, or Enter for patch)"
    
    if ($versionChoice -eq '' -or $versionChoice -eq '1') {
        $Patch = $true
        $versionBumpType = "Patch"
    }
    elseif ($versionChoice -eq '2') {
        $Minor = $true
        $versionBumpType = "Minor"
    }
    elseif ($versionChoice -eq '3') {
        $Major = $true
        $versionBumpType = "Major"
    }
    elseif ($versionChoice -eq '4') {
        $PreRelease = "alpha"
        $versionBumpType = "Alpha Pre-Release"
    }
    elseif ($versionChoice -eq '5') {
        $PreRelease = "beta"
        $versionBumpType = "Beta Pre-Release"
    }
    elseif ($versionChoice -eq '6') {
        $PreRelease = "rc"
        $versionBumpType = "Release Candidate"
    }
    elseif ($versionChoice -eq '7' -and $parsedVersion.PreReleaseType) {
        $Release = $true
        $versionBumpType = "Release (from pre-release)"
    }
    elseif ($versionChoice -eq '0') {
        $NoVersion = $true
        $versionBumpType = "None"
    }
}

# Calculate new version
if (-not $NoVersion) {
    try {
        $newVersion = Update-Version -current $parsedVersion `
            -major:$Major `
            -minor:$Minor `
            -patch:$Patch `
            -preRelease:$PreRelease `
            -release:$Release
        
        Write-Host "   New Version: $newVersion ($versionBumpType)" -ForegroundColor $Green
    }
    catch {
        Write-Host "   ⚠️ Version bump skipped: $_" -ForegroundColor $Yellow
        $NoVersion = $true
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

# Add version tag to commit message if version was bumped
if ($newVersion) {
    $finalMessage = "$finalMessage [v$newVersion]"
}

# Determine push action text
$pushAction = if ($NoPush) { "commit only (no push)" } else { "commit and push" }

# Confirm before committing
Write-Host "`n🔍 Commit Preview:" -ForegroundColor $Cyan
Write-Host "   Branch:  $currentBranch" -ForegroundColor $Yellow
Write-Host "   Message: $finalMessage" -ForegroundColor $Yellow
if ($newVersion) {
    Write-Host "   Version: $currentVersion → $newVersion" -ForegroundColor $Yellow
}
Write-Host "   Action:  $pushAction" -ForegroundColor $Yellow
Write-Host "`nProceed? (Y/n): " -ForegroundColor $Yellow -NoNewline
$confirm = Read-Host

if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Host "`n❌ Commit cancelled." -ForegroundColor $Red
    exit 1
}

# Update version file if version was bumped
if ($newVersion) {
    Write-Host "`n📝 Updating version file..." -ForegroundColor $Cyan
    Set-Version $newVersion
}

# Stage all changes
Write-Host "📦 Staging all changes..." -ForegroundColor $Cyan
git add -A

# Commit with message
Write-Host "💾 Committing..." -ForegroundColor $Cyan
git commit -m $finalMessage

if ($LASTEXITCODE -eq 0) {
    # Create git tag for version if version was bumped
    if ($newVersion) {
        Write-Host "🏷️  Creating git tag v$newVersion..." -ForegroundColor $Cyan
        git tag -a "v$newVersion" -m "Release version $newVersion"
    }
    
    if (-not $NoPush) {
        # Push to remote
        Write-Host "🚀 Pushing to remote..." -ForegroundColor $Cyan
        git push
        
        if ($LASTEXITCODE -eq 0) {
            # Push tags if version was created
            if ($newVersion) {
                Write-Host "🚀 Pushing tags..." -ForegroundColor $Cyan
                git push --tags
            }
            Write-Host "`n✅ Successfully committed and pushed!" -ForegroundColor $Green
            if ($newVersion) {
                Write-Host "   Version: $newVersion" -ForegroundColor $Green
            }
        } else {
            # Try setting upstream if push fails
            Write-Host "   Setting upstream branch..." -ForegroundColor $Yellow
            git push --set-upstream origin $currentBranch
            if ($LASTEXITCODE -eq 0) {
                if ($newVersion) {
                    git push --tags
                }
                Write-Host "`n✅ Successfully committed and pushed!" -ForegroundColor $Green
                if ($newVersion) {
                    Write-Host "   Version: $newVersion" -ForegroundColor $Green
                }
            } else {
                Write-Host "`n⚠️ Commit successful but push failed." -ForegroundColor $Yellow
            }
        }
    } else {
        Write-Host "`n✅ Successfully committed! (push skipped)" -ForegroundColor $Green
        if ($newVersion) {
            Write-Host "   Version: $newVersion" -ForegroundColor $Green
            Write-Host "   💡 Don't forget to push tags: git push --tags" -ForegroundColor $Yellow
        }
    }
} else {
    Write-Host "`n❌ Commit failed." -ForegroundColor $Red
}
