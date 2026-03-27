import type { JSX } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { SessionProvider } from "../features/auth/session-provider";
import { CaptureRoute } from "../routes/capture-route";
import { LibraryRoute } from "../routes/library-route";
import { LoginRoute } from "../routes/login-route";
import { ProtectedLayout } from "../routes/protected-layout";
import { SeedDetailRoute } from "../routes/seed-detail-route";

export const App = (): JSX.Element => (
  <SessionProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Navigate replace to="/library" />} path="/" />
        <Route element={<Navigate replace to="/library" />} path="/app" />
        <Route element={<LoginRoute />} path="/login" />
        <Route element={<ProtectedLayout />}>
          <Route element={<CaptureRoute />} path="/capture" />
          <Route element={<LibraryRoute />} path="/library" />
          <Route element={<SeedDetailRoute />} path="/seeds/:seedId" />
        </Route>
      </Routes>
    </BrowserRouter>
  </SessionProvider>
);
