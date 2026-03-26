import type { JSX } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppRoute } from "../routes/app-route";
import { LoginRoute } from "../routes/login-route";

export const App = (): JSX.Element => (
  <BrowserRouter>
    <Routes>
      <Route element={<Navigate replace to="/app" />} path="/" />
      <Route element={<LoginRoute />} path="/login" />
      <Route element={<AppRoute />} path="/app" />
    </Routes>
  </BrowserRouter>
);
