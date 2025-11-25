export const getEnv = (key: string, defaultValue?: string): string => {
  if (typeof window !== "undefined") {
    // Client-side: Use NEXT_PUBLIC_ prefixed variables
    const value = process.env[`NEXT_PUBLIC_${key}`] || defaultValue;
    if (!value) {
      console.warn(`Environment variable NEXT_PUBLIC_${key} is not set`);
    }
    return value || "";
  }
  // Server-side: Direct access to all environment variables
  return process.env[key] || defaultValue || "";
};

export const APP_URL = getEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
