import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usersApi } from "../services/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = (payload) => {
    localStorage.setItem("token", payload.token);
    document.cookie = `auth_token=${encodeURIComponent(payload.token)}; Path=/; SameSite=Lax`;
    localStorage.setItem("user", JSON.stringify(payload.user));
    setUser(payload.user);
  };

  const updateUser = (nextUser) => {
    if (!nextUser) return;
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    document.cookie = "auth_token=; Path=/; Max-Age=0; SameSite=Lax";
    localStorage.removeItem("user");
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    document.cookie = `auth_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;

    usersApi
      .me()
      .then((res) => {
        if (res.data?.user) {
          updateUser(res.data.user);
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      });
  }, []);

  const value = useMemo(() => ({ user, login, logout, updateUser }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
