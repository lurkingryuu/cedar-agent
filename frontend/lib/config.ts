export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8280/v1',
  apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
};

export function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': API_CONFIG.apiKey,
  };
}

