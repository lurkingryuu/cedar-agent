// Get runtime config from window object (injected by layout) or fall back to build-time env vars
function getRuntimeConfig() {
  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
    return (window as any).__RUNTIME_CONFIG__;
  }
  // Fallback to build-time environment variables
  return {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8280/v1',
    apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
  };
}

// Get config with priority: localStorage > runtime config > build-time env vars
function getConfig() {
  const runtimeConfig = getRuntimeConfig();
  
  // Check localStorage first (user settings take precedence)
  if (typeof window !== 'undefined') {
    const storedBaseUrl = localStorage.getItem("CEDAR_API_BASE_URL");
    const storedApiKey = localStorage.getItem("CEDAR_API_KEY");
    
    if (storedBaseUrl || storedApiKey) {
      return {
        baseUrl: storedBaseUrl || runtimeConfig.baseUrl,
        apiKey: storedApiKey || runtimeConfig.apiKey,
      };
    }
  }
  
  // Return runtime config (which includes fallback to build-time env vars)
  return runtimeConfig;
}

export const API_CONFIG = {
  get baseUrl() {
    return getConfig().baseUrl;
  },
  get apiKey() {
    return getConfig().apiKey;
  },
};

export function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': API_CONFIG.apiKey,
  };
}

