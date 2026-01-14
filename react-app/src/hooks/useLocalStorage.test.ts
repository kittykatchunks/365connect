// ============================================
// useLocalStorage Hook Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });
  
  it('should return initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));
    
    expect(result.current[0]).toBe('defaultValue');
  });
  
  it('should return stored value when it exists', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'));
    
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));
    
    expect(result.current[0]).toBe('storedValue');
  });
  
  it('should update value when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));
    
    act(() => {
      result.current[1]('newValue');
    });
    
    expect(result.current[0]).toBe('newValue');
  });
  
  it('should persist value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));
    
    act(() => {
      result.current[1]('persistedValue');
    });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('persistedValue'));
  });
  
  it('should handle object values', () => {
    const { result } = renderHook(() => 
      useLocalStorage('objectKey', { name: 'test', count: 0 })
    );
    
    expect(result.current[0]).toEqual({ name: 'test', count: 0 });
    
    act(() => {
      result.current[1]({ name: 'updated', count: 1 });
    });
    
    expect(result.current[0]).toEqual({ name: 'updated', count: 1 });
  });
  
  it('should handle array values', () => {
    const { result } = renderHook(() => 
      useLocalStorage('arrayKey', [1, 2, 3])
    );
    
    expect(result.current[0]).toEqual([1, 2, 3]);
    
    act(() => {
      result.current[1]([4, 5, 6]);
    });
    
    expect(result.current[0]).toEqual([4, 5, 6]);
  });
  
  it('should handle function updater', () => {
    const { result } = renderHook(() => useLocalStorage('counterKey', 0));
    
    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    
    expect(result.current[0]).toBe(1);
  });
  
  it('should remove value when removeValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('removeKey', 'initial'));
    
    act(() => {
      result.current[2](); // removeValue
    });
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('removeKey');
  });
});
