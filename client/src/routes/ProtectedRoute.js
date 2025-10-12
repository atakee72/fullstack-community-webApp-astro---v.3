import React from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../utils/getToken.js";

function ProtectedRoute({ children }) {
  const token = getToken();

  return token ? children : <Navigate to="/Login" />;
}

export default ProtectedRoute;
