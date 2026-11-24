import { BrowserRouter, Route, Routes, useLocation, useNavigate, type Location } from 'react-router';
import { Toaster } from 'sonner';
import { Activities } from '../screens/Activities';
import { Bikes } from '../screens/Bikes';
import { GearDetail } from '../screens/GearDetail';
import { Overview } from '../screens/Overview';
import { Placeholder } from '../screens/Placeholder';
import { Retired } from '../screens/Retired';
import { Shoes } from '../screens/Shoes';
import { SettingsDialog } from '../components/SettingsDialog';
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
      <Toaster
        theme={theme}
        position="top-right"
        offset={{ top: 92, right: 54 }}
        mobileOffset={{ top: 72, right: 16, left: 16 }}
      />
    </>
  );
}

function Screens() {
  const { data, ready } = useStore();
  if (!ready) return null;
  if (!data) return <Start />;

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

/**
 * /settings is a modal over whatever was on screen: links to it pass that
 * screen as `state.background`, and the routes keep rendering it. Opened
 * directly (typed or reloaded), Overview sits behind it.
 */
function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSettings = location.pathname === '/settings';
  const background = (location.state as { background?: Location } | null)?.background;
  const behind = isSettings ? (background ?? { ...location, pathname: '/', state: null }) : location;

  const closeSettings = () => {
    if (background) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <>
      <Routes location={behind}>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="gear/:id" element={<GearDetail />} />
          <Route path="shoes" element={<Shoes />} />
          <Route path="bikes" element={<Bikes />} />
          <Route path="activities" element={<Activities />} />
          <Route path="retired" element={<Retired />} />
          <Route path="*" element={<Placeholder screen="notFound" />} />
        </Route>
      </Routes>
      {isSettings && <SettingsDialog onClose={closeSettings} />}
    </>
  );
}
