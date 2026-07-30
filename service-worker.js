const CACHE='qraos-complete-v4-1';
const ASSETS=['./','./index.html','./assets/styles.css','./assets/app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r&&r.ok){const x=r.clone();caches.open(CACHE).then(k=>k.put(e.request,x))}return r}).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):undefined)))});
