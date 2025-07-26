import { act, renderHook } from '@testing-library/react';
import { useCharacterStore, type Profile } from './characterStore';

describe('useCharacterStore', () => {
  it('should have correct initial state', () => {
    const { result } = renderHook(() => useCharacterStore());
    expect(result.current.profile.name).toBe('Player');
    expect(result.current.stats.stamina).toBe(100);
    expect(result.current.healthStatus).toBe('Healthy');
    expect(result.current.money).toBe(1000);
    expect(result.current.team).toEqual([]);
  });

  it('should update the profile when setProfile is called', () => {
    const { result } = renderHook(() => useCharacterStore());

    const newProfile: Profile = {
      name: 'Misty',
      age: 16,
      gender: 'Female',
      description: 'A water-type trainer.',
    };

    act(() => {
      result.current.setProfile(newProfile);
    });

    expect(result.current.profile).toEqual(newProfile);
  });
});