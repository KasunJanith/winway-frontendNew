import axios from "axios";
const api = axios.create({ baseURL: "https://backoffice.884.lk/pyapi/api/v1" });

export const uploadArchive = (file, date, options = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  if (date) formData.append("date", date);
  if (options.isBulk) formData.append("is_bulk", "true");
  if (options.bulkNumber != null) formData.append("bulk_number", String(options.bulkNumber));
  return api.post("/upload-dbf-archive", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const getOrders = (date) => api.get(`/orders/${date}`);
export const getOrderBulks = (date) => api.get(`/orders/${date}/bulks`);
export const saveOrders = (data) => api.post("/orders", data);
export const getAssignments = (date) => api.get(`/assignments/${date}`);
export const saveAssignments = (data) => api.post("/assignments", data);
export const splitForAgent = (data) => api.post("/split-for-agent", data);
export const listAgentSplits = (sessionId, agentName) =>
  api.get(`/agent-splits/${sessionId}/${agentName}`);
export const downloadFile = (sessionId, filename, originalName) => {
  const params = { session: sessionId };
  if (originalName) params.original_name = originalName;
  return api.get(`/download-file/${filename}`, {
    params,
    responseType: "blob",
  });
};
export const getLatestAssignmentDate = () =>
  api.get('/assignments/latest');
export const downloadAgentZip = (sessionId, agentName) =>
  api.get(`/download-agent-zip/${sessionId}/${agentName}`, {
    responseType: "blob",
  });
export const getLatestOrderDate = () => api.get("/orders/latest");
export const getAssignedCounts = (agentName, assignmentDate, options = {}) =>
  api.get("/assigned-counts", {
    params: {
      agent_name: agentName,
      assignment_date: assignmentDate,
      session_id: options.sessionId,
      bulk_number: options.bulkNumber,
    },
  });
export const getDrawNumbers = (date) => api.get(`/draw-numbers/${date}`);
export const getSessionByDate = (date) =>
  api.get("/sessions/by-date", { params: { date } });
export const listSessionsByDate = (date) =>
  api.get("/sessions/list-by-date", { params: { date } });
export const getSessionLotteries = (sessionId) =>
  api.get(`/sessions/${sessionId}/lotteries`);
export const getAgentSplits = (sessionId, agentName) =>
  api.get(`/agent-splits/${sessionId}/${agentName}`);

export const getSplitsByDate = (agentName, date) =>
  api.get("/splits-by-date", { params: { agent_name: agentName, date } });
export const getDashboardStats = (date) =>
  api.get("/dashboard/stats", { params: { date } });
export const validateUpload = (date, options = {}) => {
  const params = { date };
  if (options.sessionId) params.session_id = options.sessionId;
  if (options.bulkNumber != null) params.bulk_number = options.bulkNumber;
  return api.get("/validate-upload", { params });
};
export const uploadWinningArchive = (file, date) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("date", date); // <-- send the date
  return api.post("/upload-winning-archive", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const validateWinning = (sessionId) =>
  api.get(`/validate-winning/${sessionId}`);
export const splitWinning = (data) => api.post("/split-winning", data);
export const listAgentWinningSplits = (sessionId, agentName) =>
  api.get(`/agent-winning-splits/${sessionId}/${agentName}`);
export const downloadWinningFile = (sessionId, filename, originalName) => {
  const params = { session: sessionId };
  if (originalName) params.original_name = originalName;
  return api.get(`/download-winning-file/${filename}`, {
    params,
    responseType: "blob",
  });
};
export const downloadAgentWinningZip = (sessionId, agentName) =>
  api.get(`/download-agent-winning-zip/${sessionId}/${agentName}`, {
    responseType: "blob",
  });
export const getWinningSessionByDate = (date) =>
  api.get("/winning-session-by-date", { params: { date } });
export const getWinningFilesByDate = (date) =>
  api.get("/winning-files-by-date", { params: { date } });

export const createSpecialSplit = (data) =>
  api.post('/special-split', data, {
    headers: { 'Content-Type': 'application/json' },
  });

export const getSpecialSplits = (agentName, date) =>
  api.get('/special-splits', {
    params: { agent_name: agentName, date },
  });

export const downloadSpecialFile = (sessionId, filename) =>
  api.get(`/download-special-file/${filename}`, {
    params: { session: sessionId },
    responseType: 'blob',
  });
  export const getSpecialSplitsRemaining = (agentName, date) =>
  api.get('/special-splits-remaining', {
    params: { agent_name: agentName, date },
  });

export const downloadSpecialZip = (agentName, date, options = {}) =>
  api.get('/download-special-zip', {
    params: {
      agent_name: agentName,
      date,
      split_label: options.splitLabel,
      lottery_code: options.lotteryCode,
    },
    responseType: 'blob',
  });

export const downloadRemainingZip = (agentName, date) =>
  api.get('/download-remaining-zip', {
    params: { agent_name: agentName, date },
    responseType: 'blob',
  });

// Splitter Settings & Options Management
export const getSplitterSettings = () => api.get("/splitter/settings");
export const getSplitterValidations = () => api.get("/splitter/validations");
export const updateSplitterValidations = (data) => api.put("/splitter/validations", data);
export const getSplitterAgents = () => api.get("/splitter/agents");
export const addSplitterAgent = (data) => api.post("/splitter/agents", data);
export const updateSplitterAgent = (id, data) => api.put(`/splitter/agents/${id}`, data);
export const deleteSplitterAgent = (id) => api.delete(`/splitter/agents/${id}`);
export const getSplitterLotteries = () => api.get("/splitter/lotteries");
export const addSplitterLottery = (data) => api.post("/splitter/lotteries", data);
export const updateSplitterLottery = (code, data) => api.put(`/splitter/lotteries/${code}`, data);
export const deleteSplitterLottery = (code) => api.delete(`/splitter/lotteries/${code}`);