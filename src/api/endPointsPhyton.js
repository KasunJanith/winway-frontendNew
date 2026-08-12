import axios from "axios";
import { ENV } from "../config/env";

const pyApi = axios.create({
  baseURL: ENV.REACT_APP_API_BASE_PY,
});

/* ------------------------------------------
   Registration Count API
------------------------------------------ */
export const countRegistrations = async (file, startDate, endDate) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("start_date", startDate);
    formData.append("end_date", endDate);

    const response = await pyApi.post("/registrations/count", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Registration count error:", error);
    throw error;
  }
};

/* ------------------------------------------
   Lottery Last Purchase Time API
------------------------------------------ */
export const getLastPurchaseTime = async (zipFile, filterDate) => {
  try {
    const formData = new FormData();
    formData.append("zip_file", zipFile);
    formData.append("filter_date", filterDate);

    const response = await pyApi.post(
      "/lottery/last-purchase-time",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Last purchase time error:", error);
    throw error;
  }
};

/* ------------------------------------------
   Monthly Activation Count API
------------------------------------------ */
export const getMonthlyActivations = async (
  file,
  startDate = null,
  endDate = null
) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    if (startDate) formData.append("start_date", startDate);
    if (endDate) formData.append("end_date", endDate);

    const response = await pyApi.post(
      "/registrations/monthly-activations",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Monthly activation error:", error);
    throw error;
  }
};

/* ------------------------------------------
   Reconciliation Summary API
------------------------------------------ */
export const getReconciliationSummary = async (zipFile) => {
  try {
    const formData = new FormData();
    formData.append("zip_file", zipFile);

    const response = await pyApi.post("/reconciliation/winning-summary", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Reconciliation summary error:", error);
    throw error;
  }
};

/* ------------------------------------------
   Summary API
------------------------------------------ */
export const getSummery = async (zipFile) => {
  try {
    const formData = new FormData();
    formData.append("zip_file", zipFile);

    const response = await pyApi.post("/summary", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Summary error:", error);
    throw error;
  }
};

/* ------------------------------------------
   Customers by Date Range Grouped by Date
------------------------------------------ */
export const getCustomersByDateRange = async (file, startDate, endDate) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("start_date", startDate);
    formData.append("end_date", endDate);

    const response = await pyApi.post(
      "/registrations/customers-by-range-grouped",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log("Customers by date range response:", response.data);

    return response.data;
  } catch (error) {
    console.error("Customers by date range error:", error);
    throw error;
  }
};


export const uploadArchive = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return pyApi.post('/upload-dbf-archive', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const splitLottery = (data) => {
  // data: { session_id, lottery_name, draw_number, assignments: [{agent_name, count}] }
  return pyApi.post('/split', data, {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const downloadZip = (sessionId) =>
  pyApi.get(`/download-zip/${sessionId}`, { responseType: 'blob' });