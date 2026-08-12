const isDev = process.env.NODE_ENV === "development";

const getEnv = (key) => {
  const value = process.env[key];

  if (isDev) {
    console.log(`[ENV] Reading ${key}:`, value || "❌ MISSING");
  }

  if (!value) {
    console.error(`[ENV ERROR] Missing environment variable: ${key}`);
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
};

export const ENV = {
  REACT_APP_API_BASE_PY: getEnv("REACT_APP_API_BASE_PY"),
  API_BASE_LOCAL: getEnv("REACT_APP_API_BASE_LOCAL"),
  APP_NAME: getEnv("REACT_APP_APP_NAME"),
  SMS_SENDER: getEnv("REACT_APP_SMS_SENDER"),
};

if (isDev) {
  console.log("[ENV] Loaded environment config:", ENV);
}
