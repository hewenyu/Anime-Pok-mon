import { Outlet } from 'react-router-dom';
import { SaveGameModal } from '../../features/modal/components/SaveGameModal';

const RootLayout = () => {
  return (
    <>
      <Outlet />
      <SaveGameModal />
      {/* Other global modals can be added here */}
    </>
  );
};

export default RootLayout;