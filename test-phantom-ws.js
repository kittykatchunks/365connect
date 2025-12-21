#!/usr/bin/env node
/**
 * Phantom WebSocket Connection Test
 * Tests direct connection to Phantom API WebSocket server
 */

const WebSocket = require('ws');

// Test configuration
const TEST_URL = 'wss://server1-388.phantomapi.net:8089/ws';
const TEST_TIMEOUT = 10000; // 10 seconds

console.log('='.repeat(80));
console.log('Phantom WebSocket Connection Test');
console.log('='.repeat(80));
console.log(`Target URL: ${TEST_URL}`);
console.log(`Timeout: ${TEST_TIMEOUT}ms`);
console.log('-'.repeat(80));

// Test with different SSL options
const testConfigs = [
  {
    name: 'Default (strict SSL)',
    options: {}
  },
  {
    name: 'Relaxed SSL (ignore certificate errors)',
    options: {
      rejectUnauthorized: false
    }
  }
];

async function testConnection(config) {
  return new Promise((resolve) => {
    console.log(`\n📡 Testing: ${config.name}`);
    console.log(`   Options: ${JSON.stringify(config.options)}`);
    
    const startTime = Date.now();
    let resolved = false;
    
    const ws = new WebSocket(TEST_URL, config.options);
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.terminate();
        console.log(`   ⏱️  TIMEOUT after ${TEST_TIMEOUT}ms`);
        resolve({ success: false, error: 'Connection timeout', config: config.name });
      }
    }, TEST_TIMEOUT);
    
    ws.on('open', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        console.log(`   ✅ CONNECTED in ${duration}ms`);
        console.log(`   State: ${ws.readyState}`);
        ws.close();
        resolve({ success: true, duration, config: config.name });
      }
    });
    
    ws.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        console.log(`   ❌ ERROR after ${duration}ms`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code || 'N/A'}`);
        console.log(`   Errno: ${error.errno || 'N/A'}`);
        resolve({ success: false, error: error.message, code: error.code, config: config.name });
      }
    });
    
    ws.on('close', (code, reason) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        console.log(`   ⚠️  CLOSED after ${duration}ms`);
        console.log(`   Code: ${code}`);
        console.log(`   Reason: ${reason || '(no reason provided)'}`);
        resolve({ success: false, error: `Closed with code ${code}`, config: config.name });
      }
    });
  });
}

async function runTests() {
  const results = [];
  
  for (const config of testConfigs) {
    const result = await testConnection(config);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    successful.forEach(r => {
      console.log(`   - ${r.config}: Connected in ${r.duration}ms`);
    });
  }
  
  console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
  if (failed.length > 0) {
    failed.forEach(r => {
      console.log(`   - ${r.config}: ${r.error}`);
    });
  }
  
  console.log('\n' + '-'.repeat(80));
  console.log('RECOMMENDATIONS:');
  console.log('-'.repeat(80));
  
  if (successful.length === 0) {
    console.log('❌ No connection methods succeeded.');
    console.log('   Possible causes:');
    console.log('   1. Phantom API server is down or unreachable');
    console.log('   2. Firewall blocking port 8089');
    console.log('   3. DNS resolution failure');
    console.log('   4. Network connectivity issues');
    console.log('\n   Recommended actions:');
    console.log('   1. Verify server status with Phantom API provider');
    console.log('   2. Test network connectivity: ping server1-388.phantomapi.net');
    console.log('   3. Check firewall rules for outbound port 8089');
    console.log('   4. Consider implementing WebSocket proxy through your server');
  } else if (successful[0].config.includes('Relaxed')) {
    console.log('⚠️  Connection only works with relaxed SSL validation.');
    console.log('   This indicates SSL certificate issues:');
    console.log('   - Certificate may be self-signed');
    console.log('   - Certificate may be expired');
    console.log('   - Certificate hostname may not match');
    console.log('\n   Browser clients cannot bypass SSL validation.');
    console.log('   Recommended solution: Implement WebSocket proxy through your server');
  } else {
    console.log('✅ Direct connection works with strict SSL.');
    console.log('   The browser should be able to connect directly.');
    console.log('   Check browser console for other issues (CORS, mixed content, etc.)');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run the tests
runTests().catch(console.error);
