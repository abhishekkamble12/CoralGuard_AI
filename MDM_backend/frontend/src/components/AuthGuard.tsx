import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "../api/client";

export function AuthGuard() {
  if (!getToken()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
