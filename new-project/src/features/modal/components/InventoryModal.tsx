import React, { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useCharacterStore } from '@/store/characterStore';
import { useModal } from '@/hooks/useModal';
import type { InventoryItem, Pokemon } from '@/types';
import { PokemonCard } from '@/app/components/ui/PokemonCard';

const MODAL_ID = 'inventory';

export const InventoryModal: React.FC = () => {
  const { modalType, closeModal } = useUIStore();
  const { inventory, team: pokemonTeam } = useCharacterStore();
  const { isOpen } = useModal(MODAL_ID);
  const [activeTab, setActiveTab] = useState<'items' | 'pokemon'>('items');

  if (!isOpen || modalType !== MODAL_ID) {
    return null;
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-2xl font-bold">背包</h2>
          <button onClick={closeModal} className="text-gray-500 hover:text-gray-800" aria-label="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="mt-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('items')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'items'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
                aria-selected={activeTab === 'items'}
              >
                物品
              </button>
              <button
                onClick={() => setActiveTab('pokemon')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pokemon'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
                aria-selected={activeTab === 'pokemon'}
              >
                宝可梦
              </button>
            </nav>
          </div>
        </div>

        <div className="mt-6">
          {activeTab === 'items' && <ItemsPanel items={inventory} />}
          {activeTab === 'pokemon' && <PokemonPanel pokemonTeam={pokemonTeam} />}
        </div>
      </div>
    </div>
  );
};

const ItemsPanel: React.FC<{ items: InventoryItem[] }> = ({ items }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  if (items.length === 0) {
    return <p>背包是空的。</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="border rounded-md p-2 cursor-pointer" onClick={() => setSelectedItemId(item.id === selectedItemId ? null : item.id)}>
          <div className="flex justify-between items-center">
            <span>{item.name}</span>
            <span className="text-gray-500">x{item.quantity}</span>
          </div>
          {selectedItemId === item.id && (
            <p className="text-sm text-gray-600 mt-2">{item.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
};

const PokemonPanel: React.FC<{ pokemonTeam: Pokemon[] }> = ({ pokemonTeam }) => {
  if (pokemonTeam.length === 0) {
    return <p>队伍中没有宝可梦。</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {pokemonTeam.map((pokemon) => (
        <PokemonCard key={pokemon.id} pokemon={pokemon} variant="compact" />
      ))}
    </div>
  );
};