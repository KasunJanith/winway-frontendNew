import axios from "axios";
import { ENV } from "../config/env";

const getToken = () => {
  return localStorage.getItem("token");
};

export const mainApi = axios.create({
  baseURL: ENV.API_BASE_MAIN,
  headers: {
    "Content-Type": "application/json",
  },
});

export const localApi = axios.create({
  baseURL: ENV.API_BASE_LOCAL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ------------------------------------------
   Attach token automatically to every request
------------------------------------------ */
localApi.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

mainApi.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/* ------------------------------------------
   Optional: Handle expired token globally
------------------------------------------ */
localApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized or token expired");

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Optional redirect
      // window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

/* ------------------------------------------
   APIs
------------------------------------------ */
export const getCombinedCustomers = () => {
  return localApi.get("/loyalCustomer/combined");
};

export const getMonthlyUpgrades = () => {
  return localApi.get("/loyalCustomer/monthly-upgrades");
};

export const getSettings = () => {
  return localApi.get("/settings");
};

export const saveSettingsGroup = async (group) => {
  const updates = Object.entries(group);

  for (const [key, value] of updates) {
    await localApi.post("/settings", {
      key,
      value,
      type: "number",
    });
  }
};

export const removeCustomer = (mobileNumber) => {
  return localApi.delete(
    `/loyalCustomer/remove/${encodeURIComponent(mobileNumber)}`,
  );
};

export const formatMobileNumber = (mobileNumber) => {
  return localApi.post("/loyalCustomer/format-mobile", {
    mobileNumber,
  });
};

export const normalizeNumbers = () => {
  return localApi.put("/loyalCustomer/normalize-mobile-numbers");
};
/* ------------------------------------------
   Loyalty Monthly Upgrades History API
------------------------------------------ */
export const getMonthlyUpgradeSummary = async () => {
  const res = await localApi.get("/loyalCustomer/monthly-upgrade-summery");
  return res.data;
};
export const removeRemovedDoneMembers = () => {
  return localApi.delete(
    "/loyalCustomer/remove-removed-done-members",
  );
};