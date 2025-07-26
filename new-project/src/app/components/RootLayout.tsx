import { Outlet } from 'react-router-dom';
import { SaveGameModal } from '../../features/modal/components/SaveGameModal';
import { InventoryModal } from '../../features/modal/components/InventoryModal';
import PokemonDetailModal from '../../features/modal/components/PokemonDetailModal';

const RootLayout = () => {
  return (
    <>
      <Outlet />
      <SaveGameModal />
      <InventoryModal />
      <PokemonDetailModal />
      {/* Other global modals can be added here */}
    </>
  );
};

export default RootLayout;