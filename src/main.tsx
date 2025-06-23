import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Enhanced PWA service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('SW registered: ', registration);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, prompt user to refresh
              if (confirm('New version available! Refresh to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });
      
      // Listen for controlling service worker changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  });
}

// PWA install prompt
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA install prompt available');
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show custom install button/banner
  showInstallPromotion();
});

function showInstallPromotion() {
  // Check if user previously dismissed and don't show again for 7 days
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed);
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedTime < sevenDaysInMs) {
      return; // Don't show install prompt
    }
  }

  // Create install banner
  const installBanner = document.createElement('div');
  installBanner.id = 'install-banner';
  installBanner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #0284c7, #0369a1);
    color: white;
    padding: 12px 16px;
    text-align: center;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.4;
  `;
  
  installBanner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="/wpid-logo_pln.jpg" alt="PLN Logo" style="width: 24px; height: 24px; border-radius: 4px;">
        <span><strong>Install PLN Warehouse App</strong> - Get quick access and work offline!</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button id="install-button" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
          Install
        </button>
        <button id="dismiss-install" style="
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          font-size: 18px;
          padding: 4px;
          line-height: 1;
        " title="Dismiss">×</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(installBanner);
  
  // Add event listeners
  document.getElementById('install-button')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      deferredPrompt = null;
      installBanner.remove();
    }
  });
  
  document.getElementById('dismiss-install')?.addEventListener('click', () => {
    installBanner.remove();
    // Remember user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  });
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (document.getElementById('install-banner')) {
      installBanner.remove();
    }
  }, 10000);
}

// Handle successful installation
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed successfully');
  // Remove install banner if still visible
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.remove();
  }
  // Clear dismissed flag
  localStorage.removeItem('pwa-install-dismissed');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)