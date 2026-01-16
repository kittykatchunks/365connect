// ============================================
// useTabNotification Hook Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabNotification } from '@/hooks/useTabNotification';

describe('useTabNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should initialize with correct functions', () => {
    const { result } = renderHook(() => useTabNotification());
    
    expect(typeof result.current.setTabAlert).toBe('function');
    expect(typeof result.current.clearTabAlert).toBe('function');
    expect(typeof result.current.clearAllAlerts).toBe('function');
    expect(typeof result.current.getTabState).toBe('function');
    expect(typeof result.current.getTabAlertClass).toBe('function');
  });

  it('should return default state for tabs without alerts', () => {
    const { result } = renderHook(() => useTabNotification());
    
    const state = result.current.getTabState('dial');
    expect(state).toBe('default');
  });

  it('should set warning state for a tab', () => {
    const { result } = renderHook(() => useTabNotification());
    
    act(() => {
      result.current.setTabAlert('contacts', 'warning');
    });
    
    const state = result.current.getTabState('contacts');
    expect(state).toBe('warning');
  });

  it('should set error state for a tab', () => {
    const { result } = renderHook(() => useTabNotification());
    
    act(() => {
      result.current.setTabAlert('activity', 'error');
    });
    
    const state = result.current.getTabState('activity');
    expect(state).toBe('error');
  });

  it('should clear alert for a specific tab', () => {
    const { result } = renderHook(() => useTabNotification());
    
    act(() => {
      result.current.setTabAlert('contacts', 'warning');
    });
    
    expect(result.current.getTabState('contacts')).toBe('warning');
    
    act(() => {
      result.current.clearTabAlert('contacts');
    });
    
    expect(result.current.getTabState('contacts')).toBe('default');
  });

  it('should clear all alerts', () => {
    const { result } = renderHook(() => useTabNotification());
    
    act(() => {
      result.current.setTabAlert('contacts', 'warning');
      result.current.setTabAlert('activity', 'error');
      result.current.setTabAlert('companyNumbers', 'warning');
    });
    
    expect(result.current.getTabState('contacts')).toBe('warning');
    expect(result.current.getTabState('activity')).toBe('error');
    expect(result.current.getTabState('companyNumbers')).toBe('warning');
    
    act(() => {
      result.current.clearAllAlerts();
    });
    
    expect(result.current.getTabState('contacts')).toBe('default');
    expect(result.current.getTabState('activity')).toBe('default');
    expect(result.current.getTabState('companyNumbers')).toBe('default');
  });

  it('should return correct CSS class for warning state', () => {
    const { result } = renderHook(() => useTabNotification());
    
    act(() => {
      result.current.setTabAlert('contacts', 'warning');
    });
    
    const className = result.current.getTabAlertClass('contacts');
    expect(className).toBe('tab-alert-warning');
  });

  it('should return correct CSS class for error state', () => {
    const { result } = renderHook(() => useTabNotification());
    
    act(() => {
      result.current.setTabAlert('activity', 'error');
    });
    
    const className = result.current.getTabAlertClass('activity');
    expect(className).toBe('tab-alert-error');
  });

  it('should return undefined CSS class for default state', () => {
    const { result } = renderHook(() => useTabNotification());
    
    const className = result.current.getTabAlertClass('dial');
    expect(className).toBeUndefined();
  });

  it('should handle multiple tabs with different states', () => {
    const { result } = renderHook(() => useTabNotification());
    
    act(() => {
      result.current.setTabAlert('contacts', 'warning');
      result.current.setTabAlert('activity', 'error');
      result.current.setTabAlert('settings', 'warning');
    });
    
    expect(result.current.getTabState('contacts')).toBe('warning');
    expect(result.current.getTabState('activity')).toBe('error');
    expect(result.current.getTabState('settings')).toBe('warning');
    expect(result.current.getTabState('dial')).toBe('default');
  });

  it('should override previous state when setting new state', () => {
    const { result } = renderHook(() => useTabNotification());
    
    act(() => {
      result.current.setTabAlert('contacts', 'warning');
    });
    
    expect(result.current.getTabState('contacts')).toBe('warning');
    
    act(() => {
      result.current.setTabAlert('contacts', 'error');
    });
    
    expect(result.current.getTabState('contacts')).toBe('error');
  });

  it('should clear alert when setting to default state', () => {
    const { result } = renderHook(() => useTabNotification());
    
    act(() => {
      result.current.setTabAlert('contacts', 'warning');
    });
    
    expect(result.current.getTabState('contacts')).toBe('warning');
    
    act(() => {
      result.current.setTabAlert('contacts', 'default');
    });
    
    expect(result.current.getTabState('contacts')).toBe('default');
  });
});
