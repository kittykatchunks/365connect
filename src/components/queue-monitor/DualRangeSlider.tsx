// ============================================
// Dual Range Slider Component
// Two-handle range slider with colored zones (Green, Amber, Red)
// ============================================

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { cn, isVerboseLoggingEnabled } from '@/utils';
import './DualRangeSlider.css';

interface DualRangeSliderProps {
  /** Minimum value (0) */
  min: number;
  /** Maximum value (100) */
  max: number;
  /** Warning threshold value (first handle) */
  warnValue: number;
  /** Breach threshold value (second handle) */
  breachValue: number;
  /** Callback when values change */
  onChange: (warnValue: number, breachValue: number) => void;
  /** Unit label (e.g., "%", "s") */
  unit?: string;
  /** Whether slider is disabled */
  disabled?: boolean;
  /** Optional CSS class */
  className?: string;
  /** Accessible label */
  'aria-label'?: string;
}

export function DualRangeSlider({
  min,
  max,
  warnValue,
  breachValue,
  onChange,
  unit = '',
  disabled = false,
  className,
  'aria-label': ariaLabel
}: DualRangeSliderProps) {
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Local state for dragging
  const [isDraggingWarn, setIsDraggingWarn] = useState(false);
  const [isDraggingBreach, setIsDraggingBreach] = useState(false);
  
  const trackRef = useRef<HTMLDivElement>(null);
  const warnThumbRef = useRef<HTMLDivElement>(null);
  const breachThumbRef = useRef<HTMLDivElement>(null);
  
  // Calculate percentages for positioning
  const warnPercent = ((warnValue - min) / (max - min)) * 100;
  const breachPercent = ((breachValue - min) / (max - min)) * 100;
  
  // Ensure breach is always >= warn
  useEffect(() => {
    if (breachValue < warnValue) {
      if (verboseLogging) {
        console.warn('[DualRangeSlider] ⚠️ Breach value cannot be less than warn value. Adjusting...');
      }
      onChange(warnValue, warnValue);
    }
  }, [warnValue, breachValue, onChange, verboseLogging]);
  
  const handleMouseDown = (handle: 'warn' | 'breach') => (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    if (handle === 'warn') {
      setIsDraggingWarn(true);
    } else {
      setIsDraggingBreach(true);
    }
    
    if (verboseLogging) {
      console.log('[DualRangeSlider] 🖱️ Mouse down on:', handle);
    }
  };
  
  const handleTouchStart = (handle: 'warn' | 'breach') => () => {
    if (disabled) return;
    
    if (handle === 'warn') {
      setIsDraggingWarn(true);
    } else {
      setIsDraggingBreach(true);
    }
    
    if (verboseLogging) {
      console.log('[DualRangeSlider] 👆 Touch start on:', handle);
    }
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingWarn && !isDraggingBreach) return;
      if (!trackRef.current) return;
      
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const value = Math.round((percent / 100) * (max - min) + min);
      
      if (isDraggingWarn) {
        // Warn handle - cannot exceed breach
        const newWarnValue = Math.min(value, breachValue);
        if (newWarnValue !== warnValue) {
          onChange(newWarnValue, breachValue);
        }
      } else if (isDraggingBreach) {
        // Breach handle - cannot go below warn
        const newBreachValue = Math.max(value, warnValue);
        if (newBreachValue !== breachValue) {
          onChange(warnValue, newBreachValue);
        }
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingWarn && !isDraggingBreach) return;
      if (!trackRef.current) return;
      
      const touch = e.touches[0];
      const rect = trackRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const value = Math.round((percent / 100) * (max - min) + min);
      
      if (isDraggingWarn) {
        const newWarnValue = Math.min(value, breachValue);
        if (newWarnValue !== warnValue) {
          onChange(newWarnValue, breachValue);
        }
      } else if (isDraggingBreach) {
        const newBreachValue = Math.max(value, warnValue);
        if (newBreachValue !== breachValue) {
          onChange(warnValue, newBreachValue);
        }
      }
    };
    
    const handleMouseUp = () => {
      if (isDraggingWarn || isDraggingBreach) {
        if (verboseLogging) {
          console.log('[DualRangeSlider] ✅ Final values:', { warnValue, breachValue });
        }
      }
      setIsDraggingWarn(false);
      setIsDraggingBreach(false);
    };
    
    if (isDraggingWarn || isDraggingBreach) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDraggingWarn, isDraggingBreach, warnValue, breachValue, min, max, onChange, verboseLogging]);
  
  // Keyboard navigation
  const handleKeyDown = (handle: 'warn' | 'breach') => (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    let newValue = handle === 'warn' ? warnValue : breachValue;
    const step = 1;
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newValue = Math.min(max, newValue + step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newValue = Math.max(min, newValue - step);
        break;
      case 'Home':
        e.preventDefault();
        newValue = min;
        break;
      case 'End':
        e.preventDefault();
        newValue = max;
        break;
      default:
        return;
    }
    
    if (handle === 'warn') {
      onChange(Math.min(newValue, breachValue), breachValue);
    } else {
      onChange(warnValue, Math.max(newValue, warnValue));
    }
  };
  
  const zoneStyles: CSSProperties = {
    '--warn-percent': `${warnPercent}%`,
    '--breach-percent': `${breachPercent}%`,
  } as CSSProperties;
  
  return (
    <div 
      className={cn('dual-range-slider', { 'disabled': disabled }, className)}
      aria-label={ariaLabel}
    >
      <div className="dual-range-slider-values">
        <div className="value-display warn">
          <span className="value-label">WARN</span>
          <span className="value-number">{warnValue}{unit}</span>
        </div>
        <div className="value-display breach">
          <span className="value-label">BREACH</span>
          <span className="value-number">{breachValue}{unit}</span>
        </div>
      </div>
      
      <div className="dual-range-slider-container">
        <div 
          ref={trackRef}
          className="dual-range-slider-track"
          style={zoneStyles}
        >
          {/* Colored zones */}
          <div className="zone zone-green" />
          <div className="zone zone-amber" />
          <div className="zone zone-red" />
          
          {/* Range between handles */}
          <div 
            className="range-highlight"
            style={{
              left: `${warnPercent}%`,
              width: `${breachPercent - warnPercent}%`
            }}
          />
          
          {/* Warn handle */}
          <div
            ref={warnThumbRef}
            className={cn('slider-thumb thumb-warn', { 'dragging': isDraggingWarn })}
            style={{ left: `${warnPercent}%` }}
            onMouseDown={handleMouseDown('warn')}
            onTouchStart={handleTouchStart('warn')}
            onKeyDown={handleKeyDown('warn')}
            role="slider"
            aria-label="Warning threshold"
            aria-valuemin={min}
            aria-valuemax={breachValue}
            aria-valuenow={warnValue}
            aria-valuetext={`${warnValue}${unit}`}
            tabIndex={disabled ? -1 : 0}
          >
            <div className="thumb-tooltip">{warnValue}{unit}</div>
          </div>
          
          {/* Breach handle */}
          <div
            ref={breachThumbRef}
            className={cn('slider-thumb thumb-breach', { 'dragging': isDraggingBreach })}
            style={{ left: `${breachPercent}%` }}
            onMouseDown={handleMouseDown('breach')}
            onTouchStart={handleTouchStart('breach')}
            onKeyDown={handleKeyDown('breach')}
            role="slider"
            aria-label="Breach threshold"
            aria-valuemin={warnValue}
            aria-valuemax={max}
            aria-valuenow={breachValue}
            aria-valuetext={`${breachValue}${unit}`}
            tabIndex={disabled ? -1 : 0}
          >
            <div className="thumb-tooltip">{breachValue}{unit}</div>
          </div>
        </div>
        
        {/* Min/Max labels */}
        <div className="dual-range-slider-labels">
          <span className="label-min">{min}{unit}</span>
          <span className="label-max">{max}{unit}</span>
        </div>
      </div>
    </div>
  );
}
