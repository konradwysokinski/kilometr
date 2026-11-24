import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { GearDetail } from '../screens/GearDetail';
import { Notifications } from '../screens/Notifications';
import { Overview } from '../screens/Overview';
import { Placeholder } from '../screens/Placeholder';
import { Start } from '../screens/Start';
import { Layout } from './Layout';
import { useStore } from './store';

export function App() {
  const { theme } = useStore();
  return (
    <>
      <Screens />
      {/* Mounted once, always, so toasts survive moving between Start and the app. */}
      <Toaster theme={theme} position="bottom-right" offset={24} mobileOffset={16} />
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
          <Route path="shoes" element={<Placeholder screen="shoes" />} />
          <Route path="bikes" element={<Placeholder screen="bikes" />} />
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
