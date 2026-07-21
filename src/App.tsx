import { Route, Routes } from "react-router";
import { AppLayout } from "./layouts";
import { AboutPage, HomePage, NotFoundPage } from "./pages";

export const App = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<HomePage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
