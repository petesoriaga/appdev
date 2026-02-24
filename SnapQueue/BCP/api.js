(() => {
  const DEFAULT_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;
  const sameOriginBase = `${window.location.origin}/api`;
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const currentPort = String(window.location.port || "");
  const baseURL = isLocalHost && currentPort && currentPort !== "5000" ? DEFAULT_BASE : sameOriginBase;
  const TOKEN_KEY = "token";
  const REQUEST_TIMEOUT_MS = 15000;
  const nativeFetch = window.fetch.bind(window);
  let pendingRequests = 0;
  let globalLoadingEl = null;
  let globalLoadingTextEl = null;
  let loadingShowTimer = null;

  function isLoginPage() {
    return /\/login\.html$/i.test(window.location.pathname);
  }

  function ensureGlobalLoadingUI() {
    if (globalLoadingEl) return;
    globalLoadingEl = document.getElementById("global-api-loading");
    if (globalLoadingEl) {
      globalLoadingTextEl = document.getElementById("global-api-loading-text");
      return;
    }

    const container = document.createElement("div");
    container.id = "global-api-loading";
    container.style.position = "fixed";
    container.style.top = "10px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.zIndex = "9999";
    container.style.padding = "8px 12px";
    container.style.borderRadius = "9999px";
    container.style.background = "rgba(15, 23, 42, 0.92)";
    container.style.color = "#fff";
    container.style.fontSize = "11px";
    container.style.fontWeight = "700";
    container.style.letterSpacing = "0.04em";
    container.style.textTransform = "uppercase";
    container.style.boxShadow = "0 8px 20px rgba(15,23,42,0.25)";
    container.style.pointerEvents = "none";
    container.style.opacity = "0";
    container.style.transition = "opacity 160ms ease";

    const text = document.createElement("span");
    text.id = "global-api-loading-text";
    text.textContent = "Loading...";
    container.appendChild(text);

    document.body.appendChild(container);
    globalLoadingEl = container;
    globalLoadingTextEl = text;
  }

  function setGlobalLoading(loading, message = "Loading...") {
    if (document.readyState === "loading") return;
    ensureGlobalLoadingUI();
    if (!globalLoadingEl || !globalLoadingTextEl) return;
    globalLoadingTextEl.textContent = message;
    globalLoadingEl.style.opacity = loading ? "1" : "0";
  }

  function beginRequest(path) {
    pendingRequests += 1;
    if (!isLoginPage() && !loadingShowTimer) {
      loadingShowTimer = window.setTimeout(() => {
        loadingShowTimer = null;
        if (pendingRequests > 0) {
          setGlobalLoading(true, "Loading...");
        }
      }, 350);
    }
    window.dispatchEvent(new CustomEvent("api:loading", { detail: { path, loading: true, pending: pendingRequests } }));
  }

  function endRequest(path) {
    pendingRequests = Math.max(0, pendingRequests - 1);
    if (pendingRequests === 0) {
      if (loadingShowTimer) {
        window.clearTimeout(loadingShowTimer);
        loadingShowTimer = null;
      }
      setGlobalLoading(false);
    }
    window.dispatchEvent(new CustomEvent("api:loading", { detail: { path, loading: false, pending: pendingRequests } }));
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      document.cookie = `auth_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
    }
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = "auth_token=; Path=/; Max-Age=0; SameSite=Lax";
  }

  function syncTokenCookie() {
    const token = getToken();
    if (!token) return;
    document.cookie = `auth_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
  }

  function hasAdminAccess(role) {
    const normalized = String(role || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    return normalized === "admin" || normalized === "super_admin" || normalized === "superadmin";
  }

  async function ensureSession({ redirectTo = "login.html", requireAdmin = false } = {}) {
    const maybeRedirect = () => {
      if (redirectTo) {
        window.location.href = redirectTo;
      }
    };
    const token = getToken();
    if (!token) {
      maybeRedirect();
      return { ok: false };
    }
    try {
      const response = await request("/auth/me");
      if (!response?.success || !response?.user) {
        clearToken();
        maybeRedirect();
        return { ok: false };
      }
      if (requireAdmin && !hasAdminAccess(response?.user?.role)) {
        window.location.href = "dashboard.html";
        return { ok: false, user: response.user };
      }
      return { ok: true, user: response.user };
    } catch (_error) {
      clearToken();
      maybeRedirect();
      return { ok: false };
    }
  }

  async function request(path, options = {}) {
    beginRequest(path);
    try {
      const token = getToken();
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response;
      try {
        response = await nativeFetch(`${baseURL}${path}`, {
          ...options,
          headers,
          signal: controller.signal
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw new Error("Unable to reach the server. Please check your connection.");
      } finally {
        window.clearTimeout(timeout);
      }

      let data = null;
      try {
        data = await response.json();
      } catch (_err) {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 401) {
          clearToken();
          if (!["/auth/signin", "/auth/signup"].includes(path) && !window.location.pathname.endsWith("login.html")) {
            window.location.href = "login.html";
          }
        }
        const message = data?.message || `Request failed (${response.status})`;
        const requestError = new Error(message);
        requestError.status = response.status;
        requestError.data = data;
        throw requestError;
      }

      return data;
    } finally {
      endRequest(path);
    }
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    beginRequest(String(url || ""));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const mergedOptions = { ...options, signal: controller.signal };
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }
    }
    try {
      const response = await nativeFetch(url, mergedOptions);
      return response;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
      endRequest(String(url || ""));
    }
  }

  // Guard all raw fetch() usages in legacy pages so they do not hang indefinitely.
  window.fetch = (url, options = {}) => fetchWithTimeout(url, options);
  syncTokenCookie();
  document.addEventListener("DOMContentLoaded", () => {
    syncTokenCookie();
    if (pendingRequests > 0) {
      setGlobalLoading(true, "Loading...");
    }
  });

  window.API = {
    baseURL,
    REQUEST_TIMEOUT_MS,
    getToken,
    setToken,
    clearToken,
    syncTokenCookie,
    fetchWithTimeout,
    ensureSession,
    auth: {
      signup: (payload) => request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
      signin: (payload) => request("/auth/signin", { method: "POST", body: JSON.stringify(payload) }),
      forgotPassword: (payload) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
      resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
      me: () => request("/auth/me")
    },
    reservations: {
      create: (payload) => request("/reservations", { method: "POST", body: JSON.stringify(payload) }),
      checkAvailability: (dateISO) => request(`/reservations/availability?date=${encodeURIComponent(dateISO)}`),
      dashboardList: () => request("/reservations/dashboard"),
      list: () => request("/reservations"),
      getById: (id) => request(`/reservations/${id}`),
      updatePricing: (id, payload) => request(`/reservations/${id}/pricing`, { method: "PATCH", body: JSON.stringify(payload) }),
      acceptPricing: (id) => request(`/reservations/${id}/pricing/accept`, { method: "POST" }),
      rejectPricing: (id) => request(`/reservations/${id}/pricing/reject`, { method: "POST" }),
      cancel: (id, cancellationReason) => request(`/reservations/${id}/cancel`, { method: "POST", body: JSON.stringify({ cancellationReason }) }),
      updateStatus: (id, statusOrPayload, workflowStage) => {
        const payload = typeof statusOrPayload === "object"
          ? statusOrPayload
          : { status: statusOrPayload, ...(workflowStage ? { workflowStage } : {}) };
        return request(`/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) });
      }
    },
    payments: {
      create: (payload) => request("/payments", { method: "POST", body: JSON.stringify(payload) }),
      byReservation: (reservationId) => request(`/payments/reservation/${reservationId}`),
      list: () => request("/payments"),
      deleteById: async (id) => {
        try {
          return await request(`/payments/${id}`, { method: "DELETE" });
        } catch (error) {
          if (/route not found/i.test(String(error?.message || ""))) {
            return request(`/payments/${id}/delete`, { method: "POST" });
          }
          throw error;
        }
      },
      updateStatus: (id, status) => request(`/payments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
      requestRefund: (id, reasonOrPayload) => {
        const payload = typeof reasonOrPayload === "object"
          ? reasonOrPayload
          : { reason: reasonOrPayload };
        return request(`/payments/${id}/refund/request`, { method: "POST", body: JSON.stringify(payload) });
      },
      resolveRefund: (id, actionOrPayload) => {
        const payload = typeof actionOrPayload === "object"
          ? actionOrPayload
          : { action: actionOrPayload };
        return request(`/payments/${id}/refund/resolve`, { method: "POST", body: JSON.stringify(payload) });
      }
    },
    users: {
      me: () => request("/users/me"),
      updateMe: (payload) => request("/users/me", { method: "PATCH", body: JSON.stringify(payload) }),
      deleteMe: () => request("/users/me", { method: "DELETE" }),
      changePassword: (payload) => request("/users/me/password", { method: "PATCH", body: JSON.stringify(payload) }),
      list: () => request("/users"),
      setBlocked: async (id, blocked) => {
        try {
          return await request(`/users/${id}/block`, { method: "PATCH", body: JSON.stringify({ blocked }) });
        } catch (error) {
          if (/route not found/i.test(String(error?.message || ""))) {
            try {
              return await request(`/users/block/${id}`, { method: "PATCH", body: JSON.stringify({ blocked }) });
            } catch (fallbackError) {
              if (/route not found/i.test(String(fallbackError?.message || ""))) {
                return request(`/users/${id}/ban`, { method: "PATCH", body: JSON.stringify({ blocked }) });
              }
              throw fallbackError;
            }
          }
          throw error;
        }
      },
      deleteById: async (id) => {
        try {
          return await request(`/users/${id}`, { method: "DELETE" });
        } catch (error) {
          if (/route not found/i.test(String(error?.message || ""))) {
            return request(`/users/delete/${id}`, { method: "DELETE" });
          }
          throw error;
        }
      }
    },
    archive: {
      me: () => request("/archive/me"),
      adminReservationFolders: (reservationId) => request(`/archive/admin/reservation/${reservationId}`),
      adminCreateFolder: (payload) => request("/archive/admin/folders", { method: "POST", body: JSON.stringify(payload) }),
      adminUpload: (payload) => request("/archive/admin/upload", { method: "POST", body: JSON.stringify(payload) })
    },
    gallery: {
      list: (category) => request(`/gallery${category ? `?category=${encodeURIComponent(category)}` : ""}`)
    },
    chatbot: {
      listQA: () => request("/chatbot/qa"),
      askAI: (question) => request("/chatbot/ai", { method: "POST", body: JSON.stringify({ question }) }),
      getMyLiveThread: () => request("/chatbot/live/thread"),
      listMyLiveThreads: () => request("/chatbot/live/threads/me"),
      listLiveThreads: (status) => request(`/chatbot/live/threads${status ? `?status=${encodeURIComponent(status)}` : ""}`),
      listLiveMessages: (threadId, after) =>
        request(`/chatbot/live/threads/${threadId}/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`),
      sendLiveMessage: (threadId, text) =>
        request(`/chatbot/live/threads/${threadId}/messages`, { method: "POST", body: JSON.stringify({ text }) }),
      updateLiveThreadStatus: (threadId, status) =>
        request(`/chatbot/live/threads/${threadId}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
    },
    contact: {
      create: (payload) => request("/contact", { method: "POST", body: JSON.stringify(payload) })
    },
    system: {
      status: () => request("/system/status"),
      stats: () => request("/system/stats"),
      adminStatus: () => request("/system/admin"),
      updateAdmin: (payload) => request("/system/admin", { method: "PATCH", body: JSON.stringify(payload) })
    },
    ads: {
      listActive: async () => {
        try {
          return await request("/ads");
        } catch (error) {
          if (/route not found/i.test(String(error?.message || ""))) {
            try {
              return await request("/advertisements");
            } catch (fallbackError) {
              if (/route not found/i.test(String(fallbackError?.message || ""))) {
                return request("/adverts");
              }
              throw fallbackError;
            }
          }
          throw error;
        }
      },
      listAdmin: async () => {
        try {
          return await request("/ads/admin");
        } catch (error) {
          if (/route not found/i.test(String(error?.message || ""))) {
            try {
              return await request("/advertisements/admin");
            } catch (fallbackError) {
              if (/route not found/i.test(String(fallbackError?.message || ""))) {
                return request("/adverts/admin");
              }
              throw fallbackError;
            }
          }
          throw error;
        }
      },
      create: async (payload) => {
        try {
          return await request("/ads", { method: "POST", body: JSON.stringify(payload) });
        } catch (error) {
          if (/route not found/i.test(String(error?.message || ""))) {
            try {
              return await request("/advertisements", { method: "POST", body: JSON.stringify(payload) });
            } catch (fallbackError) {
              if (/route not found/i.test(String(fallbackError?.message || ""))) {
                return request("/adverts", { method: "POST", body: JSON.stringify(payload) });
              }
              throw fallbackError;
            }
          }
          throw error;
        }
      },
      update: async (id, payload) => {
        try {
          return await request(`/ads/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
        } catch (error) {
          if (/route not found/i.test(String(error?.message || ""))) {
            try {
              return await request(`/advertisements/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
            } catch (fallbackError) {
              if (/route not found/i.test(String(fallbackError?.message || ""))) {
                return request(`/adverts/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
              }
              throw fallbackError;
            }
          }
          throw error;
        }
      },
      remove: async (id) => {
        try {
          return await request(`/ads/${id}`, { method: "DELETE" });
        } catch (error) {
          if (/route not found/i.test(String(error?.message || ""))) {
            try {
              return await request(`/advertisements/${id}`, { method: "DELETE" });
            } catch (fallbackError) {
              if (/route not found/i.test(String(fallbackError?.message || ""))) {
                return request(`/adverts/${id}`, { method: "DELETE" });
              }
              throw fallbackError;
            }
          }
          throw error;
        }
      }
    }
  };
})();
