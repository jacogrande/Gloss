import {
  Suspense,
  lazy,
  type JSX,
} from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

const CaptureRoute = lazy(async () => ({
  default: (await import("../routes/capture-route")).CaptureRoute,
}));
const LibraryRoute = lazy(async () => ({
  default: (await import("../routes/library-route")).LibraryRoute,
}));
const LoginRoute = lazy(async () => ({
  default: (await import("../routes/login-route")).LoginRoute,
}));
const ProtectedLayout = lazy(async () => ({
  default: (await import("../routes/protected-layout")).ProtectedLayout,
}));
const SeedDetailRoute = lazy(async () => ({
  default: (await import("../routes/seed-detail-route")).SeedDetailRoute,
}));

const RouteFallback = (): JSX.Element => (
  <main className="screen screen--auth">
    <div className="auth-card">
      <p className="auth-card__eyebrow">Gloss</p>
      <h1>Loading</h1>
    </div>
  </main>
);

export const App = (): JSX.Element => (
  <BrowserRouter>
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  </BrowserRouter>
);
