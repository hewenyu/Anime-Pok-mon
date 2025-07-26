import React from 'react';
import { useNavigate } from 'react-router-dom';
import CharacterCreationForm from './components/CharacterCreationForm';
import { useCharacterStore, type Profile } from '../../store/characterStore';
import { useGameStore } from '../../store/gameStore';

const CharacterCreationScreen: React.FC = () => {
  const navigate = useNavigate();
  const setProfile = useCharacterStore((state) => state.setProfile);
  const setGameMode = useGameStore((state) => state.setGameMode);

  const handleSubmit = (data: Omit<Profile, 'description'> & { description: string; age: number }) => {
    // The form gives us a string for age, but the store expects a number.
    // The form component already handles parsing, so we can just pass it through.
    const profileData: Profile = {
        ...data,
        age: Number(data.age) // Ensure age is a number
    };

    setProfile(profileData);
    setGameMode('InGame');
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-white mb-6">创建你的角色</h1>
        <CharacterCreationForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default CharacterCreationScreen;