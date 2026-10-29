import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '../components/common/ToastProvider.jsx';
import { AppStoreProvider } from './AppStoreProvider.jsx';
import { router } from './router.jsx';

export default function App() {
  return (
    <ToastProvider>
      <AppStoreProvider>
        <RouterProvider router={router} />
      </AppStoreProvider>
    </ToastProvider>
  );
}
