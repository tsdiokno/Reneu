import React from 'react';

export interface DropdownSelectOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface DropdownSelectProps<T extends string | number> {
  value: T;
  options: DropdownSelectOption<T>[];
  onChange: (value: T) => void;
  label?: string; // Optional field label displayed above the dropdown
  icon?: React.ReactNode;
  placeholder?: string;
  title?: string;
  ariaLabel?: string;
  className?: string;
  isActive?: boolean;
  disabled?: boolean;
}

/**
 * Reusable dropdown component matching the exact filter menu styling from the Notes View.
 * Provides accessible, native OS combobox behavior with polished typographical styling.
 */
export function DropdownSelect<T extends string | number>({
  value,
  options,
  onChange,
  label,
  icon,
  placeholder,
  title,
  ariaLabel,
  className = '',
  isActive = false,
  disabled = false,
}: DropdownSelectProps<T>) {
  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder || String(value);

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[var(--text-primary)] select-none">
          {label}
        </label>
      )}

      <div className="relative inline-flex items-center w-full">
        {/* Visual styled trigger button matching NotesFilterToolbar */}
        <button
          type="button"
          disabled={disabled}
          className={`w-full h-9 inline-flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors cursor-pointer text-xs font-medium select-none ${
            isActive
              ? 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--text-primary)]/5'
              : 'border-[var(--line-subtle)] hover:border-[var(--text-primary)]/40 text-[var(--text-subtle)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          title={title || (label ? `${label}: ${displayLabel}` : displayLabel)}
          aria-label={ariaLabel || label || displayLabel}
        >
          {icon && <span className="shrink-0 opacity-75">{icon}</span>}
          <span className="truncate flex-1 text-left font-sans">{displayLabel}</span>
          <span className="font-mono text-xs opacity-60 shrink-0 select-none">▾</span>
        </button>

        {/* Native accessible select element overlay */}
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const rawVal = e.target.value;
            // Maintain numeric or string types
            const matching = options.find((opt) => String(opt.value) === rawVal);
            if (matching) {
              onChange(matching.value);
            } else {
              onChange(rawVal as unknown as T);
            }
          }}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 font-sans bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:cursor-not-allowed"
          aria-label={ariaLabel || label || displayLabel}
        >
          {options.map((opt) => (
            <option
              key={String(opt.value)}
              value={opt.value}
              disabled={opt.disabled}
              className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans"
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default DropdownSelect;
