/**
 * Developer Simulation Utilities (Purely Code-Based, Zero UI Counterparts)
 * Supports industry standard simulation patterns:
 * 1. Environment variables (VITE_SIMULATE_OFFLINE, VITE_SIMULATE_SPLASH, VITE_DEV_MODE, VITE_SIMULATE_LOGGED_OUT)
 * 2. URL query parameters (?offline=true, ?logged_out=true, ?splash=true, ?dev_mode=false, ?production=true)
 * 3. Session storage overrides for rapid dev & headless test harness controls
 * 4. DevTools console helpers (window.__SIMULATE_OFFLINE, window.__SIMULATE_LOGGED_OUT, window.__TOGGLE_DEV_MODE, window.__SIMULATE_SPLASH, window.__RESET_SIMULATIONS)
 */

export function checkSimulateOffline(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. URL Query Parameter (?offline=true, ?offline=1, ?simulate_offline=true)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('offline') || params.has('simulate_offline')) {
      const val = params.get('offline') ?? params.get('simulate_offline');
      return val === 'true' || val === '1' || val === '';
    }
  } catch {}

  // 2. Session storage dev override
  try {
    const sessionVal = sessionStorage.getItem('simulate_offline');
    if (sessionVal !== null) {
      return sessionVal === 'true';
    }
  } catch {}

  // 3. Environment Variable
  return import.meta.env.VITE_SIMULATE_OFFLINE === 'true';
}

export function setSimulateOffline(enable: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('simulate_offline', String(enable));
  } catch {}
  console.log(`[ScripturePage] Offline simulation set to: ${enable}. Dispatching update...`);
  window.dispatchEvent(new CustomEvent('scripturepage-sim-offline', { detail: enable }));
}

/**
 * Checks whether the app is simulating a Logged-Out / Guest Stand-in state.
 * When enabled, the application acts as if no user is signed in to Supabase Auth,
 * allowing instant testing of guest mode, stand-in local storage, and sign-in onboarding.
 */
export function checkSimulateLoggedOut(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. URL Query Parameter (?logged_out=true, ?guest=true, ?auth=guest, ?auth=logged_out)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('logged_out') || params.has('simulate_logged_out') || params.has('guest')) {
      const val = params.get('logged_out') ?? params.get('simulate_logged_out') ?? params.get('guest');
      return val === 'true' || val === '1' || val === '';
    }
    const authVal = params.get('auth');
    if (authVal === 'logged_out' || authVal === 'guest') {
      return true;
    }
  } catch {}

  // 2. Session storage dev override
  try {
    const sessionVal = sessionStorage.getItem('simulate_logged_out');
    if (sessionVal !== null) {
      return sessionVal === 'true';
    }
  } catch {}

  // 3. Environment Variable
  return import.meta.env.VITE_SIMULATE_LOGGED_OUT === 'true';
}

export function setSimulateLoggedOut(enable: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('simulate_logged_out', String(enable));
  } catch {}
  console.log(`[ScripturePage] Logged-out state simulation set to: ${enable}. Dispatching auth event...`);
  window.dispatchEvent(new CustomEvent('scripturepage-sim-auth', { detail: { loggedOut: enable } }));
}

export function checkSimulateSplash(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. URL Query Parameter (?splash=true, ?splash=1, ?simulate_splash=true)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('splash') || params.has('simulate_splash')) {
      const val = params.get('splash') ?? params.get('simulate_splash');
      return val === 'true' || val === '1' || val === '';
    }
  } catch {}

  // 2. Session storage dev override
  try {
    const sessionVal = sessionStorage.getItem('simulate_splash');
    if (sessionVal !== null) {
      return sessionVal === 'true';
    }
  } catch {}

  // 3. Environment Variable
  return import.meta.env.VITE_SIMULATE_SPLASH === 'true';
}

export function setSimulateSplash(enable: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('simulate_splash', String(enable));
  } catch {}
  console.log(`[ScripturePage] Splash simulation set to: ${enable}.`);
  window.dispatchEvent(new CustomEvent('scripturepage-sim-splash', { detail: enable }));
}

/**
 * Checks whether the Log-In Splash Page should be explicitly opened.
 * Supports URL query parameters (?login=true, ?auth=login, ?splash=login),
 * session storage overrides, and environment variables.
 */
export function checkSimulateLoginSplash(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. URL Query Parameter (?login=true, ?auth=login, ?splash=login, ?login_splash=true)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('login') || params.has('login_splash') || params.has('simulate_login')) {
      const val = params.get('login') ?? params.get('login_splash') ?? params.get('simulate_login');
      return val === 'true' || val === '1' || val === '';
    }
    const authVal = params.get('auth');
    if (authVal === 'login' || authVal === 'signin') {
      return true;
    }
    const splashVal = params.get('splash');
    if (splashVal === 'login' || splashVal === 'auth') {
      return true;
    }
  } catch {}

  // 2. Session storage override
  try {
    const sessionVal = sessionStorage.getItem('simulate_login_splash');
    if (sessionVal !== null) {
      return sessionVal === 'true';
    }
  } catch {}

  // 3. Environment Variable
  return import.meta.env.VITE_SIMULATE_LOGIN_SPLASH === 'true';
}

export function setSimulateLoginSplash(enable: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('simulate_login_splash', String(enable));
  } catch {}
  console.log(`[ScripturePage] Login splash simulation set to: ${enable}. Dispatching event...`);
  window.dispatchEvent(new CustomEvent('scripturepage-sim-login-splash', { detail: enable }));
}

/**
 * Checks whether the app is simulating an installed standalone PWA state.
 * Supports ?installed=true, ?simulate_installed=true, and sessionStorage.
 */
export function checkSimulateInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('installed') || params.has('simulate_installed')) {
      const val = params.get('installed') ?? params.get('simulate_installed');
      return val === 'true' || val === '1' || val === '';
    }
  } catch {}

  try {
    const sessionVal = sessionStorage.getItem('simulate_installed');
    if (sessionVal !== null) {
      return sessionVal === 'true';
    }
  } catch {}

  return import.meta.env.VITE_SIMULATE_INSTALLED === 'true';
}

export function setSimulateInstalled(enable: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('simulate_installed', String(enable));
  } catch {}
  console.log(`[ScripturePage] Installed simulation set to: ${enable}. Dispatching event...`);
  window.dispatchEvent(new CustomEvent('scripturepage-sim-installed', { detail: enable }));
}

/**
 * Checks whether Development Mode is active.
 * In Development Mode, the Gemini API key input can be blank (falling back to server environment key).
 * When toggled OFF (or in Production), AI synthesis strictly requires an explicit user Gemini API key.
 *
 * Toggle options:
 * - URL: ?dev_mode=false, ?production=true, ?require_api_key=true
 * - Console: window.__TOGGLE_DEV_MODE(false)
 * - SessionStorage: sessionStorage.setItem('dev_mode', 'false')
 * - Env: VITE_DEV_MODE="false"
 */
export function checkIsDevMode(): boolean {
  if (typeof window === 'undefined') return true;

  // 1. URL Query Parameter (highest developer convenience without touching code)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('dev_mode')) {
      const val = params.get('dev_mode');
      return val !== 'false' && val !== '0';
    }
    if (params.has('production')) {
      const val = params.get('production');
      return val !== 'true' && val !== '1' && val !== '';
    }
    if (params.has('require_api_key')) {
      const val = params.get('require_api_key');
      return val !== 'true' && val !== '1' && val !== '';
    }
    if (params.has('dev')) {
      const val = params.get('dev');
      return val !== '0' && val !== 'false';
    }
  } catch {}

  // 2. Session storage dev override
  try {
    const sessionVal = sessionStorage.getItem('dev_mode');
    if (sessionVal !== null) {
      return sessionVal !== 'false' && sessionVal !== '0';
    }
  } catch {}

  // 3. Environment Variable
  if (import.meta.env.VITE_DEV_MODE === 'false' || (import.meta.env as any).DEV_MODE === 'false') {
    return false;
  }

  // 4. Default: true in dev, false if production mode
  return import.meta.env.DEV !== false;
}

export function setIsDevMode(enable: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('dev_mode', String(enable));
  } catch {}
  console.log(
    `[ScripturePage] Dev mode set to: ${enable}. ${
      enable
        ? '(Gemini API key input can be blank; uses server dev key)'
        : '(Production mode: Gemini API key is strictly required for synthesis)'
    }`
  );
  window.dispatchEvent(new CustomEvent('scripturepage-devmode-changed', { detail: enable }));
}

/**
 * Returns active simulation flags for UI indicators.
 */
export function getActiveSimulations(): {
  offline: boolean;
  loggedOut: boolean;
  strictProduction: boolean;
  splash: boolean;
  hasAnyActive: boolean;
} {
  const offline = checkSimulateOffline();
  const loggedOut = checkSimulateLoggedOut();
  const strictProduction = !checkIsDevMode();
  const splash = checkSimulateSplash();
  return {
    offline,
    loggedOut,
    strictProduction,
    splash,
    hasAnyActive: offline || loggedOut || strictProduction || splash,
  };
}

/**
 * Resets all developer simulations back to default live state.
 */
export function resetAllSimulations(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('simulate_offline');
    sessionStorage.removeItem('simulate_logged_out');
    sessionStorage.removeItem('simulate_splash');
    sessionStorage.removeItem('simulate_login_splash');
    sessionStorage.removeItem('simulate_installed');
    sessionStorage.removeItem('dev_mode');
  } catch {}

  window.dispatchEvent(new CustomEvent('scripturepage-sim-offline', { detail: false }));
  window.dispatchEvent(new CustomEvent('scripturepage-sim-auth', { detail: { loggedOut: false } }));
  window.dispatchEvent(new CustomEvent('scripturepage-devmode-changed', { detail: true }));
  window.dispatchEvent(new CustomEvent('scripturepage-sim-splash', { detail: false }));
  window.dispatchEvent(new CustomEvent('scripturepage-sim-login-splash', { detail: false }));
  window.dispatchEvent(new CustomEvent('scripturepage-sim-installed', { detail: false }));
  console.log('[ScripturePage] All developer simulations reset to live defaults.');
}

// DevTools console helpers
if (typeof window !== 'undefined') {
  (window as any).__SIMULATE_OFFLINE = setSimulateOffline;
  (window as any).__SIMULATE_LOGGED_OUT = setSimulateLoggedOut;
  (window as any).__SIMULATE_SPLASH = setSimulateSplash;
  (window as any).__SIMULATE_LOGIN_SPLASH = setSimulateLoginSplash;
  (window as any).__SIMULATE_INSTALLED = setSimulateInstalled;
  (window as any).__OPEN_LOGIN_SPLASH = () => setSimulateLoginSplash(true);
  (window as any).__CLOSE_LOGIN_SPLASH = () => setSimulateLoginSplash(false);
  (window as any).__TOGGLE_DEV_MODE = setIsDevMode;
  (window as any).__RESET_SIMULATIONS = resetAllSimulations;
}
