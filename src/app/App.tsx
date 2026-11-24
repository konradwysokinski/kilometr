import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { Bikes } from '../screens/Bikes';
import { GearDetail } from '../screens/GearDetail';
import { Notifications } from '../screens/Notifications';
import { Overview } from '../screens/Overview';
import { Placeholder } from '../screens/Placeholder';
import { Shoes } from '../screens/Shoes';
import { Start } from '../screens/Start';
import { Layout } from './Layout';
import { useStore } from './store';

export function App() {
  const { theme } = useStore();
  return (
    <>
      <Screens />
      {/* Mounted once, always, so toasts survive moving between Start and the app. */}
      {/* Top right, just below the notification bell in the content panel. */}
      <Toaster theme={theme} position="top-right" offset={{ top: 92, right: 54 }} mobileOffset={16} />
    </>
  );
}

function Screens() {
  const { data, ready } = useStore();
  if (!ready) return null;
  if (!data) return <Start />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="gear/:id" element={<GearDetail />} />
          <Route path="shoes" element={<Shoes />} />
          <Route path="bikes" element={<Bikes />} />
          <Route path="activities" element={<Placeholder screen="activities" />} />
          <Route path="retired" element={<Placeholder screen="retired" />} />
          <Route path="settings" element={<Placeholder screen="settings" />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="*" element={<Placeholder screen="notFound" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
