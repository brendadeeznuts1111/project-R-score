#!/usr/bin/env bun
/**
 * 🎨 FactoryWager 3D AVATAR DASHBOARD v10.1
 * 
 * THREE.js powered 3D avatar visualization with real-time morphing
 * WebGL + Live Sync via WebSocket
 */

import { UserProfileEngine, profileEngine } from '@factorywager/user-profile';
import { pubsub } from '@factorywager/user-profile';

const engine = profileEngine;

/**
 * 3D Avatar Dashboard HTML with THREE.js
 */
const avatarDashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FactoryWager 3D Avatar Dashboard v10.1</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #fff;
      overflow: hidden;
    }
    #canvas-container {
      width: 100vw;
      height: 100vh;
      position: relative;
    }
    #info-panel {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.9);
      padding: 20px;
      border-radius: 8px;
      max-width: 400px;
      z-index: 100;
      border: 1px solid #00ff88;
    }
    #info-panel h2 {
      margin-bottom: 15px;
      color: #00ff88;
      font-size: 24px;
    }
    #info-panel .stat {
      margin: 10px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #info-panel .stat-label {
      color: #888;
      font-size: 14px;
    }
    #info-panel .stat-value {
      color: #00ff88;
      font-weight: bold;
      font-size: 16px;
    }
    #avatar-status {
      margin-top: 15px;
      padding: 10px;
      background: rgba(0, 255, 136, 0.1);
      border-radius: 4px;
      font-size: 12px;
      color: #00ff88;
    }
    .loading {
      position: absolute;
      font-size: 24px;
      color: #00ff88;
      z-index: 200;
    }
  </style>
</head>
<body>
  <div id="canvas-container">
    <div class="loading" id="loading">Loading 3D Avatar...</div>
    <div id="info-panel" style="display: none;">
      <h2>🎭 Profile Avatar</h2>
      <div class="stat">
        <span class="stat-label">User ID:</span>
        <span class="stat-value" id="user-id">-</span>
      </div>
      <div class="stat">
        <span class="stat-label">Display Name:</span>
        <span class="stat-value" id="display-name">-</span>
      </div>
      <div class="stat">
        <span class="stat-label">Personalization Score:</span>
        <span class="stat-value" id="pers-score">-</span>
      </div>
      <div class="stat">
        <span class="stat-label">Dry Run Shield:</span>
        <span class="stat-value" id="dry-run">-</span>
      </div>
      <div class="stat">
        <span class="stat-label">Preferred Gateway:</span>
        <span class="stat-value" id="gateway">-</span>
      </div>
      <div class="stat">
        <span class="stat-label">Safe Score (Venmo):</span>
        <span class="stat-value" id="safe-score">-</span>
      </div>
      <div class="stat">
        <span class="stat-label">Sub Level:</span>
        <span class="stat-value" id="sub-level">-</span>
      </div>
      <div id="avatar-status">Avatar ready • Real-time sync active</div>
    </div>
  </div>
  
  <script type="module">
    let scene, camera, renderer, avatar;
    let currentAvatarSeed = null;
    let profileData = null;
    
    // Initialize THREE.js scene
    function initScene() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0a);
      
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;
      
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.getElementById('canvas-container').appendChild(renderer.domElement);
      
      // Create simple avatar (sphere for now - can be enhanced with GLTF models)
      const geometry = new THREE.SphereGeometry(1, 32, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0x00ff88,
        emissive: 0x002211,
        shininess: 100
      });
      avatar = new THREE.Mesh(geometry, material);
      scene.add(avatar);
      
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0x404040);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0x00ff88, 0.8);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);
      
      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        if (avatar) {
          avatar.rotation.y += 0.01;
        }
        renderer.render(scene, camera);
      }
      animate();
      
      // Handle window resize
      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }
    
    // WebSocket connection with permessage-deflate
    const ws = new WebSocket('ws://' + window.location.host + '/ws', ['permessage-deflate']);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      initScene();
      // Request profile data
      const userId = window.location.pathname.split('/avatar/')[1] || '@ashschaeffer1';
      ws.send(JSON.stringify({ type: 'getProfile', userId }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'profile') {
        profileData = data.profile;
        currentAvatarSeed = profileData.avatarSeed;
        updateDashboard(profileData);
        morphAvatar(profileData);
      } else if (data.type === 'avatar-morph') {
        // Real-time avatar morphing
        morphAvatarTrait(data.trait, data.intensity);
      } else if (data.type === 'update') {
        // Real-time preference update
        if (profileData) {
          Object.assign(profileData, data.updates);
          updateDashboard(profileData);
          morphAvatar(profileData);
        }
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    function updateDashboard(profile) {
      document.getElementById('user-id').textContent = profile.userId || '-';
      document.getElementById('display-name').textContent = profile.displayName || profile.userId || '-';
      document.getElementById('pers-score').textContent = (profile.personalizationScore || 0).toFixed(4);
      document.getElementById('dry-run').textContent = profile.dryRun ? '🛡️ Active' : '❌ Inactive';
      document.getElementById('gateway').textContent = profile.preferredGateway || profile.gateways?.[0] || '-';
      document.getElementById('safe-score').textContent = (profile.safeScores?.venmo || 0).toFixed(4);
      document.getElementById('sub-level').textContent = profile.subLevel || '-';
      document.getElementById('info-panel').style.display = 'block';
      document.getElementById('loading').style.display = 'none';
    }
    
    function morphAvatar(profile) {
      if (!avatar) return;
      
      // Morph based on profile traits
      const scale = 1 + (profile.personalizationScore || 0) * 0.3;
      avatar.scale.set(scale, scale, scale);
      
      // Color based on dry run status
      if (profile.dryRun) {
        avatar.material.color.setHex(0x00ff88); // Green shield
        avatar.material.emissive.setHex(0x002211);
      } else {
        avatar.material.color.setHex(0xff8800); // Orange warning
        avatar.material.emissive.setHex(0x221100);
      }
    }
    
    function morphAvatarTrait(trait, intensity) {
      if (!avatar) return;
      
      // Animate trait changes
      const tween = { value: 0 };
      const duration = 500; // ms
      const start = Date.now();
      
      function animateTrait() {
        const elapsed = Date.now() - start;
        tween.value = Math.min(elapsed / duration, 1);
        
        if (trait === 'dryRunShield') {
          const scale = 1 + intensity * tween.value * 0.2;
          avatar.scale.set(scale, scale, scale);
        } else if (trait === 'venmoCrown') {
          avatar.rotation.z = intensity * tween.value * Math.PI / 4;
        }
        
        if (tween.value < 1) {
          requestAnimationFrame(animateTrait);
        }
      }
      animateTrait();
    }
  </script>
</body>
</html>
`;

/**
 * Start 3D Avatar Dashboard server
 */
export async function startAvatarDashboard(port: number = 3007) {
  const server = Bun.serve({
    port,
    hostname: '0.0.0.0',
    async fetch(req) {
      const url = new URL(req.url);
      
      // WebSocket upgrade
      if (url.pathname === '/ws' && req.headers.get('upgrade') === 'websocket') {
        return server.upgrade(req, {
          data: { connectedAt: Date.now() },
        });
      }
      
      // Avatar dashboard HTML
      if (url.pathname === '/avatar' || url.pathname === '/avatar/') {
        return new Response(avatarDashboardHTML, {
          headers: { 'Content-Type': 'text/html' },
        });
      }
      
      // Profile API for avatar
      const avatarMatch = url.pathname.match(/^\/avatar\/(.+)$/);
      if (avatarMatch) {
        const userId = avatarMatch[1];
        const profile = await engine.getProfile(userId);
        
        if (!profile) {
          return new Response(JSON.stringify({ error: 'Profile not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        // Get personalization score
        const { xgboostPers } = await import('@factorywager/xgboost-pers');
        const features = xgboostPers.extractFeatures({
          userId,
          prefs: profile,
          progress: profile.progress || {},
          geoIP: profile.location,
          subLevel: profile.subLevel,
        });
        const prediction = await xgboostPers.predict(features);
        
        return new Response(JSON.stringify({
          ...profile,
          personalizationScore: prediction.score,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return new Response('Not Found', { status: 404 });
    },
    websocket: {
      open(ws) {
        console.log(`✅ Avatar WebSocket connected: ${ws.data.connectedAt}`);
        ws.subscribe('profile-trail');
      },
      async message(ws, message) {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'getProfile') {
            const userId = data.userId;
            const profile = await engine.getProfile(userId);
            
            if (profile) {
              const features = (await import('@factorywager/xgboost-pers')).xgboostPers.extractFeatures({
                userId,
                prefs: profile,
                progress: profile.progress || {},
                geoIP: profile.location,
                subLevel: profile.subLevel,
              });
              const prediction = await (await import('@factorywager/xgboost-pers')).xgboostPers.predict(features);
              
              ws.send(JSON.stringify({
                type: 'profile',
                profile: {
                  ...profile,
                  personalizationScore: prediction.score,
                },
              }));
            }
          } else if (data.type === 'subscribe') {
            ws.subscribe(data.channel);
          }
        } catch (error) {
          console.error('Avatar WebSocket message error:', error);
        }
      },
      close(ws) {
        console.log('❌ Avatar WebSocket closed');
      },
      perMessageDeflate: true,
    },
  });
  
  // Subscribe to pub/sub events for real-time avatar morphing
  pubsub.subscribe('profile-updated', (data) => {
    server.publish('profile-trail', JSON.stringify({
      type: 'avatar-morph',
      userId: data.userId,
      trait: data.change.includes('dryRun') ? 'dryRunShield' : 'preference',
      intensity: 1.0,
    }));
  });
  
  pubsub.subscribe('personalization-peak', (data) => {
    server.publish('profile-trail', JSON.stringify({
      type: 'avatar-morph',
      userId: data.userId,
      trait: 'personalizationBoost',
      intensity: data.score,
    }));
  });
  
  console.log(`🎭 FactoryWager 3D Avatar Dashboard v10.1`);
  console.log(`   Dashboard: http://localhost:${port}/avatar`);
  console.log(`   WebSocket: ws://localhost:${port}/ws`);
  
  return server;
}

// CLI entry point
if (import.meta.main) {
  const port = parseInt(process.env.AVATAR_PORT || '3007', 10);
  startAvatarDashboard(port).catch(console.error);
}
