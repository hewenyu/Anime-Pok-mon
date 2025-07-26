import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { useCharacterStore } from '@/store/characterStore';

const MODAL_ID = 'pokemonDetail';

const PokemonDetailModal = () => {
  const { modalType, modalPayload, closeModal } = useUIStore();
  const { getPokemonByInstanceId } = useCharacterStore();

  if (modalType !== MODAL_ID) {
    return null;
  }

  const pokemonInstanceId = modalPayload?.pokemonInstanceId;
  const pokemon = pokemonInstanceId ? getPokemonByInstanceId(pokemonInstanceId) : undefined;

  if (!pokemon) {
    return (
      <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <p>未找到宝可梦</p>
          <button onClick={closeModal} className="mt-4 px-4 py-2 bg-gray-200 rounded">关闭</button>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-2xl font-bold">{pokemon.name}</h2>
          <button onClick={closeModal} className="text-gray-500 hover:text-gray-800" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="mt-4">
          <p>Lv. {pokemon.level}</p>
          <div>
            {pokemon.types.map((type) => (
              <span key={type} className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
                {type}
              </span>
            ))}
          </div>
          {/* More details will be added here */}
        </div>
      </div>
    </div>
  );
};

export default PokemonDetailModal;