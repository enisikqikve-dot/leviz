'use client';

import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Wert für "keine Auswahl" — ein leerer String ist in Radix nicht erlaubt. */
export const ANY = '__any__';

export function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-start"
      >
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown
          className={cn('text-muted-foreground size-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? <div className="mt-4 space-y-4">{children}</div> : null}
    </section>
  );
}

export function SelectFilter({
  id, label, value, options, placeholder, onChange, disabled,
}: {
  id: string;
  label: string;
  value: string | undefined;
  options: { value: string; label: string; count?: number }[];
  placeholder: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-xs">{label}</Label>
      <Select
        value={value ?? ANY}
        onValueChange={(next) => onChange(next === ANY ? undefined : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="h-10 w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
              {option.count !== undefined ? (
                <span className="text-muted-foreground ms-1.5 text-xs">({option.count})</span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Zahlenbereich mit zwei Feldern. Die Uebernahme erfolgt beim Verlassen des
 * Feldes oder mit der Eingabetaste — sonst wuerde jede getippte Ziffer eine
 * neue Suche ausloesen.
 */
export function RangeFilter({
  label, fromLabel, toLabel, from, to, unit, step, onChange,
}: {
  label: string;
  fromLabel: string;
  toLabel: string;
  from: number | undefined;
  to: number | undefined;
  unit?: string;
  step?: number;
  onChange: (next: { from?: number; to?: number }) => void;
}) {
  const [localFrom, setLocalFrom] = useState(from?.toString() ?? '');
  const [localTo, setLocalTo] = useState(to?.toString() ?? '');

  const parse = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const commit = () => onChange({ from: parse(localFrom), to: parse(localTo) });

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-muted-foreground text-xs">{label}</legend>
      <div className="flex items-center gap-2">
        <Input
          type="number" inputMode="numeric" min={0} step={step}
          aria-label={fromLabel} placeholder={fromLabel}
          value={localFrom}
          onChange={(event) => setLocalFrom(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') commit(); }}
          className="h-10"
        />
        <span className="text-muted-foreground text-sm" aria-hidden>–</span>
        <Input
          type="number" inputMode="numeric" min={0} step={step}
          aria-label={toLabel} placeholder={toLabel}
          value={localTo}
          onChange={(event) => setLocalTo(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') commit(); }}
          className="h-10"
        />
        {unit ? <span className="text-muted-foreground shrink-0 text-xs">{unit}</span> : null}
      </div>
    </fieldset>
  );
}

export function CheckboxGroup({
  label, options, selected, onChange, columns = 1, collapseAfter,
  moreLabel, lessLabel,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  columns?: 1 | 2;
  collapseAfter?: number;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = collapseAfter && !expanded ? options.slice(0, collapseAfter) : options;

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value],
    );
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-muted-foreground mb-2 text-xs">{label}</legend>
      <div className={cn('grid gap-1.5', columns === 2 && 'sm:grid-cols-2')}>
        {visible.map((option) => (
          <label
            key={option.value}
            className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors"
          >
            <input
              type="checkbox"
              className="accent-primary size-4 shrink-0"
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            <span className="truncate">{option.label}</span>
          </label>
        ))}
      </div>
      {collapseAfter && options.length > collapseAfter ? (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-primary mt-1 text-xs font-medium hover:underline"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      ) : null}
    </fieldset>
  );
}

export function ToggleFilter({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors">
      <input
        type="checkbox"
        className="accent-primary size-4 shrink-0"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
