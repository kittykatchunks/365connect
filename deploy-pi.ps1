# Raspberry Pi Deployment Script
# Usage: .\deploy-pi.ps1 [options]
# Examples:
#   .\deploy-pi.ps1                      # Interactive mode
#   .\deploy-pi.ps1 -Host 192.168.1.100  # Specify Pi IP/hostname
#   .\deploy-pi.ps1 -User pi             # Specify SSH user
#   .\deploy-pi.ps1 -SkipBuild           # Pull only, no build
#   .\deploy-pi.ps1 -PushFirst           # Push to git before deploying

param(
    [Alias("h")]
    [string]$Hostname = "",
    
    [Alias("u")]
    [string]$User = "pi",
    
    [Alias("p")]
    [string]$ProjectPath = "~/365connect",
    
    [Alias("b")]
    [string]$Branch = "",
    
    [switch]$SkipBuild,
    [switch]$PushFirst,
    [switch]$Help
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Red = "Red"
$Magenta = "Magenta"

# Configuration file for storing Pi connection details
$configFile = ".pi-deploy-config.json"

# Function to load saved configuration
function Get-SavedConfig {
    if (Test-Path $configFile) {
        try {
            return Get-Content $configFile | ConvertFrom-Json
        }
        catch {
            return $null
        }
    }
    return $null
}

# Function to save configuration
function Save-Config {
    param([string]$hostname, [string]$user, [string]$path)
    
    $config = @{
        host = $hostname
        user = $user
        projectPath = $path
        lastUsed = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    
    $config | ConvertTo-Json | Out-File -FilePath $configFile -Encoding utf8
    Write-Host "   ✅ Saved connection config for future use" -ForegroundColor $Green
}

# Show help
if ($Help) {
    Write-Host "`n🍓 Raspberry Pi Deployment Script" -ForegroundColor $Cyan
    Write-Host "────────────────────────────────────────────────" -ForegroundColor $Cyan
    Write-Host "Usage: .\deploy-pi.ps1 [options]`n" -ForegroundColor $Yellow
    Write-Host "Connection Options:" -ForegroundColor $Green
    Write-Host "  -h, -Hostname     Raspberry Pi hostname or IP address"
    Write-Host "  -u, -User         SSH username (default: pi)"
    Write-Host "  -p, -ProjectPath  Path to project on Pi (default: ~/365connect)"
    Write-Host "  -b, -Branch       Git branch to checkout (optional)"
    Write-Host "`nBehavior Options:" -ForegroundColor $Green
    Write-Host "  -SkipBuild        Pull code only, skip npm build"
    Write-Host "  -PushFirst        Push local changes to git before deploying"
    Write-Host "  -Help             Show this help`n"
    Write-Host "Examples:" -ForegroundColor $Green
    Write-Host "  .\deploy-pi.ps1"
    Write-Host "  .\deploy-pi.ps1 -Hostname 192.168.1.100"
    Write-Host "  .\deploy-pi.ps1 -Hostname raspberrypi.local -User admin"
    Write-Host "  .\deploy-pi.ps1 -PushFirst -Branch main"
    Write-Host "  .\deploy-pi.ps1 -SkipBuild  # Pull only`n"
    Write-Host "First Run Setup:" -ForegroundColor $Yellow
    Write-Host "  1. Ensure SSH is enabled on your Raspberry Pi"
    Write-Host "  2. Set up SSH key authentication (recommended):"
    Write-Host "     ssh-copy-id $User@<pi-hostname>"
    Write-Host "  3. Ensure git and node/npm are installed on Pi"
    Write-Host "  4. Clone the repository on Pi first:`n"
    Write-Host "     cd ~ && git clone <your-repo-url> 365connect`n"
    exit 0
}

Write-Host "`n🍓 Raspberry Pi Deployment" -ForegroundColor $Cyan
Write-Host "════════════════════════════════════════════" -ForegroundColor $Cyan

# Step 1: Push local changes first if requested
if ($PushFirst) {
    Write-Host "`n📤 Step 1: Pushing local changes to git..." -ForegroundColor $Yellow
    Write-Host "────────────────────────────────────────" -ForegroundColor $Cyan
    
    $hasChanges = git status --porcelain
    if ($hasChanges) {
        Write-Host "   Local changes detected. Running commit script..." -ForegroundColor $Yellow
        & .\commit.ps1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`n❌ Commit failed. Deployment aborted." -ForegroundColor $Red
            exit 1
        }
    }
    else {
        Write-Host "   ✅ No local changes to commit" -ForegroundColor $Green
        Write-Host "   Pushing any unpushed commits..." -ForegroundColor $Yellow
        git push
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`n⚠️  Push failed, but continuing with deployment..." -ForegroundColor $Yellow
        }
    }
}

# Step 2: Get Pi connection details
Write-Host "`n🔧 Step 2: Raspberry Pi Connection Setup" -ForegroundColor $Yellow
Write-Host "────────────────────────────────────────" -ForegroundColor $Cyan

# Load saved config if host not provided
$savedConfig = Get-SavedConfig
if (-not $Hostname -and $savedConfig) {
    Write-Host "   Found saved configuration:" -ForegroundColor $Green
    Write-Host "   Host: $($savedConfig.host)" -ForegroundColor $Cyan
    Write-Host "   User: $($savedConfig.user)" -ForegroundColor $Cyan
    Write-Host "   Path: $($savedConfig.projectPath)" -ForegroundColor $Cyan
    Write-Host "   Last used: $($savedConfig.lastUsed)" -ForegroundColor $Cyan
    
    $useConfig = Read-Host "`n   Use saved configuration? (Y/n)"
    if ($useConfig -ne "n" -and $useConfig -ne "N") {
        $Hostname = $savedConfig.host
        $User = $savedConfig.user
        $ProjectPath = $savedConfig.projectPath
    }
}

# Interactive mode if host still not provided
if (-not $Hostname) {
    Write-Host "`n   Enter Raspberry Pi connection details:" -ForegroundColor $Yellow
    $Hostname = Read-Host "   Hostname or IP address (e.g., 192.168.1.100 or raspberrypi.local)"
    
    if (-not $Hostname) {
        Write-Host "`n❌ Hostname is required" -ForegroundColor $Red
        exit 1
    }
    
    $userInput = Read-Host "   SSH username (default: pi)"
    if ($userInput) { $User = $userInput }
    
    $pathInput = Read-Host "   Project path on Pi (default: ~/365connect)"
    if ($pathInput) { $ProjectPath = $pathInput }
    
    # Save configuration
    Save-Config -hostname $Hostname -user $User -path $ProjectPath
}

$sshTarget = "$User@$Hostname"
Write-Host "`n   🎯 Target: $sshTarget" -ForegroundColor $Green
Write-Host "   📁 Path: $ProjectPath" -ForegroundColor $Green

# Step 3: Test SSH connection
Write-Host "`n🔌 Step 3: Testing SSH Connection..." -ForegroundColor $Yellow
Write-Host "────────────────────────────────────────" -ForegroundColor $Cyan

$testCmd = "echo 'SSH connection successful'"
$testResult = ssh -o ConnectTimeout=5 -o BatchMode=yes $sshTarget $testCmd 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ SSH connection failed!" -ForegroundColor $Red
    Write-Host "   Error: $testResult" -ForegroundColor $Red
    Write-Host "`n   Troubleshooting tips:" -ForegroundColor $Yellow
    Write-Host "   1. Verify Pi is powered on and connected to network"
    Write-Host "   2. Check hostname/IP is correct: ping $Hostname"
    Write-Host "   3. Ensure SSH is enabled on Pi"
    Write-Host "   4. Set up SSH keys: ssh-copy-id $sshTarget"
    Write-Host "   5. Try manual connection: ssh $sshTarget`n"
    exit 1
}

Write-Host "   ✅ SSH connection successful" -ForegroundColor $Green

# Step 4: Pull latest code on Pi
Write-Host "`n📥 Step 4: Pulling Latest Code on Raspberry Pi..." -ForegroundColor $Yellow
Write-Host "────────────────────────────────────────" -ForegroundColor $Cyan

# Build the deployment commands
$commands = @()

# Change to project directory
$commands += "cd $ProjectPath || { echo 'ERROR: Project path not found'; exit 1; }"

# Show current status
$commands += "echo '📍 Current directory:' && pwd"
$commands += "echo '🌿 Current branch:' && git branch --show-current"

# Checkout specific branch if requested
if ($Branch) {
    $commands += "echo '🔀 Checking out branch: $Branch' && git checkout $Branch"
}

# Fetch and pull latest changes
$commands += "echo '📡 Fetching from remote...' && git fetch --all"
$commands += "echo '⬇️  Pulling latest changes...' && git pull"

# Show what changed
$commands += "echo '📝 Recent commits:' && git log -3 --oneline"

# Build if not skipped
if (-not $SkipBuild) {
    $commands += "echo ''"
    $commands += "echo '🔨 Step 5: Building Project...'"
    $commands += "echo '────────────────────────────────────────'"
    
    # Check if package.json exists
    $commands += "if [ -f package.json ]; then"
    $commands += "  echo '📦 Installing dependencies...'"
    $commands += "  npm install"
    $commands += "  echo '🏗️  Building project...'"
    $commands += "  npm run build"
    $commands += "  echo '✅ Build complete!'"
    $commands += "else"
    $commands += "  echo '⚠️  No package.json found, skipping npm build'"
    $commands += "fi"
}
else {
    Write-Host "   ⏭️  Skipping build step (--SkipBuild flag used)" -ForegroundColor $Yellow
}

# Combine all commands
$fullCommand = $commands -join " && "

# Execute on Pi
Write-Host "   Executing on $Hostname..." -ForegroundColor $Cyan
Write-Host ""

ssh -t $sshTarget "bash -c '$fullCommand'"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Deployment failed with exit code $LASTEXITCODE" -ForegroundColor $Red
    exit 1
}

# Step 6: Show deployment summary
Write-Host "`n✅ Deployment Completed Successfully!" -ForegroundColor $Green
Write-Host "════════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host "   📍 Target: $sshTarget" -ForegroundColor $Cyan
Write-Host "   📁 Path: $ProjectPath" -ForegroundColor $Cyan
if ($Branch) {
    Write-Host "   🌿 Branch: $Branch" -ForegroundColor $Cyan
}
Write-Host ""

# Prompt for post-deployment actions
Write-Host "📋 Next Steps:" -ForegroundColor $Yellow
Write-Host "   • Application deployed and built on Raspberry Pi"
if (-not $PushFirst) {
    Write-Host "   • Run .\commit.ps1 to push local changes to git" -ForegroundColor $Magenta
}
Write-Host "   • SSH to Pi: ssh $sshTarget"
Write-Host "   • View logs: ssh $sshTarget 'cd $ProjectPath && pm2 logs'"
Write-Host "   • Restart service: ssh $sshTarget 'cd $ProjectPath && pm2 restart all'"
Write-Host ""
