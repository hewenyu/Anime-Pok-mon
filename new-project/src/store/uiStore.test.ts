import { act, renderHook } from '@testing-library/react';
import { useUIStore } from './uiStore';

describe('useUIStore', () => {
  it('should have correct initial state', () => {
    const { result } = renderHook(() => useUIStore());
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.modalType).toBeNull();
    expect(result.current.modalPayload).toBeNull();
  });

  it('should open a modal with a type and payload', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.openModal('pokemonDetail', { pokemonId: 'pika01' });
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.modalType).toBe('pokemonDetail');
    expect(result.current.modalPayload).toEqual({ pokemonId: 'pika01' });
  });

  it('should open a modal without a payload', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.openModal('worldMap');
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.modalType).toBe('worldMap');
    expect(result.current.modalPayload).toEqual({});
  });

  it('should close the modal and reset state', () => {
    const { result } = renderHook(() => useUIStore());

    // First, open a modal
    act(() => {
      result.current.openModal('editProfile');
    });

    expect(result.current.isModalOpen).toBe(true);

    // Then, close it
    act(() => {
      result.current.closeModal();
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.modalType).toBeNull();
    expect(result.current.modalPayload).toBeNull();
  });
});