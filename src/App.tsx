import { Route, Routes } from "react-router";
import { AppLayout, PublicLayout } from "./layouts";
import {
  BookingWorkspacePage,
  BookingsListPage,
  NotFoundPage,
  PaymentFailedPage,
  PaymentSuccessPage,
  PreCheckoutPage,
  StripeCheckoutPage,
} from "./pages";

export const App = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<BookingsListPage />} />
      <Route path="bookings/:quoteId" element={<BookingWorkspacePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>

    <Route element={<PublicLayout />}>
      <Route path="contribute/:token" element={<PreCheckoutPage />} />
      <Route path="contribute/:token/checkout" element={<StripeCheckoutPage />} />
      <Route path="contribute/:token/success" element={<PaymentSuccessPage />} />
      <Route path="contribute/:token/failed" element={<PaymentFailedPage />} />
    </Route>
  </Routes>
);
