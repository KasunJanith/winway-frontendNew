import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8001/dashboard",
});

export const getSummary = () => API.get("/summary");
export const getTierDistribution = () => API.get("/tier-distribution");
export const getTicketPopularity = () => API.get("/ticket-popularity");
export const getMonthlyRegistrations = () => API.get("/registrations/monthly");
export const getDailyPurchases = () => API.get("/purchases/daily");
export const getTopCustomers = () => API.get("/customers/top");
export const getUpgradeCandidates = () => API.get("/customers/upgrade-candidates");
export const getMissingEmails = () => API.get("/customers/missing-email");
export const getInactiveCustomers = () => API.get("/customers/inactive");
