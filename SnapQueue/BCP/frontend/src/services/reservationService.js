import api from "./api";

export const reservationService = {
  create: (payload) => api.post("/reservations", payload),
  list: () => api.get("/reservations"),
  cancel: (id, cancellationReason) => api.post(`/reservations/${id}/cancel`, { cancellationReason }),
  setStatus: (id, status) => api.patch(`/reservations/${id}/status`, { status })
};
