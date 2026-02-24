import api from "./api";

export const authService = {
  signup: (payload) => api.post("/auth/signup", payload),
  signin: (payload) => api.post("/auth/signin", payload),
  me: () => api.get("/auth/me")
};
