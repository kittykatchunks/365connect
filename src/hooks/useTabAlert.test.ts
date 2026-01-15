// ============================================
// useTabAlert Hook Tests
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabAlert } from '@/hooks/useTabAlert';

describe('useTabAlert', () => {
  const originalTitle = 'Original Title';
  
  beforeEach(() => {
    document.title = originalTitle;
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useTabAlert());
    
    expect(result.current.isFlashing).toBe(false);
    expect(typeof result.current.isPageVisible).toBe('boolean');
  });
  
  it('should provide startFlashing function', () => {
    const { result } = renderHook(() => useTabAlert());
    
    expect(typeof result.current.startFlashing).toBe('function');
  });
  
  it('should provide stopFlashing function', () => {
    const { result } = renderHook(() => useTabAlert());
    
    expect(typeof result.current.stopFlashing).toBe('function');
  });
  
  it('should provide setTitle function', () => {
    const { result } = renderHook(() => useTabAlert());
    
    expect(typeof result.current.setTitle).toBe('function');
  });
  
  it('should not start flashing when page is visible', () => {
    const { result } = renderHook(() => useTabAlert());
    
    // Page is visible by default in jsdom
    act(() => {
      result.current.startFlashing();
    });
    
    // Should not flash when page is visible
    expect(result.current.isFlashing).toBe(false);
  });
  
  it('should accept custom flash message option', () => {
    const { result } = renderHook(() => 
      useTabAlert({ flashMessage: 'Custom Alert!' })
    );
    
    expect(result.current).toBeDefined();
  });
  
  it('should accept custom flash interval option', () => {
    const { result } = renderHook(() => 
      useTabAlert({ flashInterval: 500 })
    );
    
    expect(result.current).toBeDefined();
  });
  
  it('should update title with setTitle', () => {
    const { result } = renderHook(() => useTabAlert());
    
    act(() => {
      result.current.setTitle('New Title');
    });
    
    expect(document.title).toBe('New Title');
  });
  
  it('should stop flashing when stopFlashing is called', () => {
    const { result } = renderHook(() => useTabAlert());
    
    act(() => {
      result.current.stopFlashing();
    });
    
    expect(result.current.isFlashing).toBe(false);
  });
});
