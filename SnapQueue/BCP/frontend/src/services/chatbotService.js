import api from "./api";

export const chatbotService = {
  list: () => api.get("/chatbot/qa"),
  create: (payload) => api.post("/chatbot/qa", payload),
  update: (id, payload) => api.patch(`/chatbot/qa/${id}`, payload),
  remove: (id) => api.delete(`/chatbot/qa/${id}`),
  getMyLiveThread: () => api.get("/chatbot/live/thread"),
  listMyLiveThreads: () => api.get("/chatbot/live/threads/me"),
  listLiveThreads: (status) => api.get(`/chatbot/live/threads${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  listLiveMessages: (threadId, after) =>
    api.get(`/chatbot/live/threads/${threadId}/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`),
  sendLiveMessage: (threadId, text) =>
    api.post(`/chatbot/live/threads/${threadId}/messages`, { text }),
  updateLiveThreadStatus: (threadId, status) =>
    api.patch(`/chatbot/live/threads/${threadId}/status`, { status })
};
