# Test Busylight Bridge Connection
# This script tests the WebSocket connection from your PC to the cloud server

Write-Host "`n=== Busylight Bridge Connection Test ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date)`n" -ForegroundColor Gray

# Test 1: Check if local bridge is running
Write-Host "[1] Testing local bridge (http://localhost:19774/health)..." -ForegroundColor Yellow
try {
    $localStatus = Invoke-RestMethod -Uri "http://localhost:19774/health" -Method Get -TimeoutSec 5
    Write-Host "  ✓ Local bridge is running" -ForegroundColor Green
    Write-Host "    Bridge: $($localStatus.bridge)" -ForegroundColor Gray
    Write-Host "    Kuando Hub: $($localStatus.kuandoHub)" -ForegroundColor Gray
    Write-Host "    Devices: $($localStatus.devices)" -ForegroundColor Gray
    Write-Host "    Server Connected: $($localStatus.serverConnected)" -ForegroundColor $(if($localStatus.serverConnected) {"Green"} else {"Red"})
    Write-Host "    Version: $($localStatus.version)`n" -ForegroundColor Gray
    
    if (-not $localStatus.serverConnected) {
        Write-Host "  ⚠ Bridge is NOT connected to server!" -ForegroundColor Red
        Write-Host "    Action: Configure server URL in bridge tray menu`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Local bridge is NOT running" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "    Action: Start the Busylight Bridge application`n" -ForegroundColor Yellow
    exit 1
}

# Test 2: Check server bridge status
$serverUrl = "connect365.servehttp.com"
Write-Host "[2] Testing server bridge status (https://$serverUrl/api/busylight-status)..." -ForegroundColor Yellow
try {
    $serverStatus = Invoke-RestMethod -Uri "https://$serverUrl/api/busylight-status" -Method Get -TimeoutSec 10
    Write-Host "  ✓ Server is reachable" -ForegroundColor Green
    Write-Host "    Connected Bridges: $($serverStatus.bridges)" -ForegroundColor $(if($serverStatus.bridges -gt 0) {"Green"} else {"Red"})
    Write-Host "    Pending Requests: $($serverStatus.pendingRequests)" -ForegroundColor Gray
    Write-Host "    Clients: $($serverStatus.clients)`n" -ForegroundColor Gray
    
    if ($serverStatus.bridges -eq 0) {
        Write-Host "  ⚠ No bridges connected to server!" -ForegroundColor Red
        Write-Host "    This PC's bridge may not be configured or connected`n" -ForegroundColor Yellow
    } else {
        Write-Host "  Bridge List:" -ForegroundColor Cyan
        foreach ($bridge in $serverStatus.bridgeList) {
            Write-Host "    • $($bridge.id)" -ForegroundColor Gray
            Write-Host "      Connected: $($bridge.connectedAt)" -ForegroundColor Gray
            Write-Host "      Last Seen: $($bridge.lastSeen)" -ForegroundColor Gray
            if ($bridge.info.version) {
                Write-Host "      Version: $($bridge.info.version)" -ForegroundColor Gray
            }
            if ($bridge.info.kuandoConnected) {
                Write-Host "      Kuando: $($bridge.info.kuandoConnected)" -ForegroundColor Gray
            }
            Write-Host ""
        }
    }
} catch {
    Write-Host "  ✗ Cannot reach server" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "    Check: Server may be down or URL incorrect`n" -ForegroundColor Yellow
}

# Test 3: Test WebSocket port 8088
Write-Host "[3] Testing WebSocket port 8088..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($serverUrl, 8088)
    if ($tcpClient.Connected) {
        Write-Host "  ✓ Port 8088 is open and accepting connections" -ForegroundColor Green
        $tcpClient.Close()
    }
} catch {
    Write-Host "  ✗ Cannot connect to port 8088" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "    Check: Firewall may be blocking port 8088`n" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: End-to-end API test
Write-Host "[4] Testing end-to-end API call through server..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-RestMethod -Uri "https://$serverUrl/api/busylight/health" -Method Get -TimeoutSec 10
    Write-Host "  ✓ API call successful!" -ForegroundColor Green
    Write-Host "    Bridge: $($apiResponse.bridge)" -ForegroundColor Gray
    Write-Host "    Kuando Hub: $($apiResponse.kuandoHub)" -ForegroundColor Gray
    Write-Host "    Devices: $($apiResponse.devices)" -ForegroundColor Gray
    Write-Host "    Version: $($apiResponse.version)`n" -ForegroundColor Gray
    Write-Host "  ✓✓✓ FULL CONNECTION WORKING! ✓✓✓" -ForegroundColor Green -BackgroundColor DarkGreen
} catch {
    Write-Host "  ✗ API call failed" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "    This means the full chain is NOT working`n" -ForegroundColor Yellow
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($localStatus.serverConnected -and $serverStatus.bridges -gt 0) {
    Write-Host "✓ Bridge is connected and working!" -ForegroundColor Green
    Write-Host "  Your PC can communicate with the cloud server" -ForegroundColor Green
} elseif ($localStatus.bridge -eq "online" -and -not $localStatus.serverConnected) {
    Write-Host "⚠ Bridge is running but NOT connected to server" -ForegroundColor Yellow
    Write-Host "  Action required:" -ForegroundColor Yellow
    Write-Host "  1. Right-click Busylight Bridge tray icon" -ForegroundColor White
    Write-Host "  2. Select 'Configure Server...'" -ForegroundColor White
    Write-Host "  3. Enter: $serverUrl" -ForegroundColor White
} else {
    Write-Host "✗ Connection not working" -ForegroundColor Red
    Write-Host "  Check the errors above for details" -ForegroundColor Red
}
Write-Host ""
