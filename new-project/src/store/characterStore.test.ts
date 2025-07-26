import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from './characterStore.ts';

describe('characterStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useCharacterStore.setState({
      profile: { name: '', gender: '男', age: 18, description: '' },
      level: 1,
    });
  });

  it('should have a default initial state', () => {
    const { profile, level } = useCharacterStore.getState();
    expect(profile.name).toBe('');
    expect(level).toBe(1);
  });

  it('should set the profile', () => {
    const newProfile = {
      name: '勇者',
      gender: '男' as const,
      age: 25,
      description: '一个测试角色',
    };
    useCharacterStore.getState().setProfile(newProfile);
    const { profile } = useCharacterStore.getState();
    expect(profile).toEqual(newProfile);
  });
});