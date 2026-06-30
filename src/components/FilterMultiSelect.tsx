import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterMultiSelectProps<T extends string> {
  id: string;
  label: string;
  options: FilterOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
}

export default function FilterMultiSelect<T extends string>({
  id,
  label,
  options,
  selected,
  onChange,
}: FilterMultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAll = () => onChange(options.map((o) => o.value));
  const clearAll = () => onChange([]);

  const triggerLabel = (() => {
    if (selected.length === 0) return `${label} (All)`;
    if (selected.length === 1) {
      const match = options.find((o) => o.value === selected[0]);
      return match?.label ?? `${label} (1)`;
    }
    return `${label} (${selected.length})`;
  })();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-white text-slate-900 font-bold cursor-pointer flex items-center justify-between gap-2 transition-all ${
          open ? 'shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] bg-slate-50' : 'hover:bg-slate-50'
        }`}
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-900 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-slate-900 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] max-h-56 overflow-y-auto"
        >
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b-2 border-slate-900 bg-slate-50">
            <button
              type="button"
              onClick={selectAll}
              className="text-[9px] font-black uppercase tracking-widest text-slate-900 hover:text-emerald-700 transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
            >
              Clear
            </button>
          </div>

          {options.map((option) => {
            const isChecked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                role="option"
                aria-selected={isChecked}
                className={`flex items-center gap-2.5 px-2.5 py-2 cursor-pointer transition-colors border-b border-slate-200 last:border-b-0 ${
                  isChecked ? 'bg-emerald-50' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`shrink-0 h-4 w-4 border-2 border-slate-900 rounded-none flex items-center justify-center transition-colors ${
                    isChecked ? 'bg-slate-900' : 'bg-white'
                  }`}
                >
                  {isChecked && <Check className="h-3 w-3 text-white stroke-[3]" />}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isChecked}
                  onChange={() => toggleOption(option.value)}
                />
                <span className="text-xs font-bold text-slate-900 leading-tight">{option.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
