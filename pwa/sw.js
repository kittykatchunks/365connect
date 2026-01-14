const cacheID = "autocab365connect_v10"; // Increment version - v10: Domain security issues

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

const CacheItems = [
    // Core files
    "index.html",
    "offline.html",
    "favicon.ico",
    // NOTE: manifest.json is NOT cached - always fetch fresh from server
    
    // Application files
    "js/agent-buttons.js",
    "js/api-phantom.js",
    "js/app-config.js",
    "js/app-startup.js",
    "js/audio-settings-manager.js",
    "js/blf-button-manager.js",
    "js/browser-cache.js",
    "js/busylight-manager.js",
    "js/call-history-manager.js",
    "js/call-history-ui.js",
    "js/company-numbers-manager.js",
    "js/contacts-manager.js",
    "js/language-manager.js",
    "js/line-key-manager.js",
    "js/phone.js",
    "js/settings-accordion.js",
    "js/sip-session-manager.js",
    "js/tab-alert-manager.js",
    "js/ui-state-manager.js",

    
    // Styles
    "css/phone.css",

    
    // External dependencies (same as before)
    "https://dtd6jl0d42sve.cloudfront.net/lib/jquery/jquery-3.6.1.min.js",
    "https://dtd6jl0d42sve.cloudfront.net/lib/jquery/jquery-ui-1.13.2.min.js",
    "https://dtd6jl0d42sve.cloudfront.net/lib/SIPjs/sip-0.21.2.min.js",
    "https://dtd6jl0d42sve.cloudfront.net/lib/Croppie/Croppie-2.6.4/croppie.min.js",
    "https://dtd6jl0d42sve.cloudfront.net/lib/moment/moment-2.24.0.min.js",
    "https://dtd6jl0d42sve.cloudfront.net/lib/Normalize/normalize-v8.0.1.css",
    "https://dtd6jl0d42sve.cloudfront.net/lib/fonts/font_roboto/roboto.css",
    "https://dtd6jl0d42sve.cloudfront.net/lib/fonts/font_awesome/css/font-awesome.min.css",
    "https://dtd6jl0d42sve.cloudfront.net/lib/jquery/jquery-ui-1.13.2.min.css",
    "https://dtd6jl0d42sve.cloudfront.net/lib/Croppie/Croppie-2.6.4/croppie.css",
];


self.addEventListener('install', function(event){
    console.log("Service Worker: Install");
    event.waitUntil(
        caches.open(cacheID)
            .then(function(cache) {
                console.log("Cache open, adding Items:", CacheItems.length, "items");
                return cache.addAll(CacheItems);
            })
            .then(function() {
                console.log("✓ All items cached successfully");
                self.skipWaiting();
            })
            .catch(function(error) {
                console.error("❌ Cache installation failed:", error);
                // Still skip waiting to allow app to work
                self.skipWaiting();
            })
    );
});

self.addEventListener('activate', function(event){
    console.log("Service Worker: Activate");
    event.waitUntil(clients.claim());
});


self.addEventListener("fetch", function(event){
    // Don't intercept API routes - let them pass through to the network naturally
    // This allows proper error handling in the application
    if (event.request.url.includes('/api/')) {
        // Return early without calling event.respondWith()
        // This lets the browser handle the request normally
        return;
    }
    
    // Don't cache manifest.json - always fetch fresh with error handling
    if (event.request.url.includes('manifest.json')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        return response;
                    }
                    console.warn('Manifest fetch failed with status:', response.status);
                    return response;
                })
                .catch(error => {
                    console.error('Error fetching manifest:', error);
                    // Return a minimal valid response to prevent PWA installation issues
                    return new Response(JSON.stringify({
                        "name": "Autocab365Connect",
                        "short_name": "Autocab365",
                        "start_url": "/",
                        "display": "standalone"
                    }), {
                        status: 200,
                        headers: { "Content-Type": "application/manifest+json" }
                    });
                })
        );
        return;
    }
    
    if(event.request.url.endsWith("index.html")){
        console.log("Special Home Page handling...", event.request.url);
        event.respondWith(loadHomePage(event.request));
    }
    else {
        // Another Request - Now using Network First
        event.respondWith(loadNetworkFirst(event.request));
    }
});

/*// PhantomAPI requests with custom User-Agent
self.addEventListener('fetch', event => {
    if (event.request.url.includes('phantomapi.net')) {
        const modifiedRequest = new Request(event.request, {
            headers: new Headers({
                ...event.request.headers,
                'User-Agent': 'autocab365 connect/1.0/VVX_6'
            })
        });

        event.respondWith(fetch(modifiedRequest));
    }
});*/

// Network First Strategy - Try network first, fallback to cache
const loadNetworkFirst = async function(request) {
    try {
        // First try to get the resource from the network
        const responseFromNetwork = await fetch(request);
        if(responseFromNetwork.ok){
            // If the request was successful, cache it and return
            addToCache(request, responseFromNetwork.clone());
            return responseFromNetwork;
        } else {
            throw new Error("Network response not ok");
        }
    }
    catch (error) {
        // Network failed, try to get from cache
        const responseFromCache = await caches.match(request);
        if (responseFromCache) {
            console.log("Network failed, serving from cache:", request.url);
            return responseFromCache;
        }
        // Both network and cache failed
        return new Response("Resource not available", {
            status: 408,
            statusText: "Network Error - Resource not cached",
            headers: { "Content-Type": "text/plain" }
        });
    }
}

// Home page handling (already network-first)
const loadHomePage = async function(request) {
    // First try to get the resource from the network
    try {
        const responseFromNetwork = await fetch(request);
        if(responseFromNetwork.ok){
            // Normal Response from server
            return responseFromNetwork;
        } else {
            throw new Error("Server Error");
        }
    }
    catch (error) {
        const responseFromCache = await caches.match("offline.html");
        if (responseFromCache) {
            return responseFromCache;
        } else {
            return new Response("Network Error", {
                status: 408,
                statusText: "Network Error",
                headers: { "Content-Type": "text/plain" }
            });
        }
    }
}

// Add response to cache
const addToCache = async function(request, response) {
    // Check if the request URL scheme is supported
    if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
        const cache = await caches.open(cacheID);
        await cache.put(request, response);
    } else {
        // Optionally log a message or handle unsupported schemes
        console.warn('Skipping caching for unsupported scheme:', request.url);
    }
}