import React from 'react';
import CharacterCreationForm from './components/CharacterCreationForm';

const CharacterCreationScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-white mb-6">创建你的角色</h1>
        <CharacterCreationForm />
      </div>
    </div>
  );
};

export default CharacterCreationScreen;