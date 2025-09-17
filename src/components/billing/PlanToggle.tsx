import { useEffect, useMemo, useState } from 'react';
import type { BillingInterval } from '@/lib/pricing';
import { Button } from '@/components/ui/button';

export interface PlanToggleProps {
  value?: BillingInterval;
  onChange?: (val: BillingInterval) => void;
}

const STORAGE_KEY = 'pricing_interval';

export function PlanToggle({ value, onChange }: PlanToggleProps) {
  const url = new URL(window.location.href);
  const paramInterval = (url.searchParams.get('interval') as BillingInterval) || undefined;
  const [internal, setInternal] = useState<BillingInterval>(value || paramInterval || 'monthly');

  useEffect(() => {
    // Persist to localStorage
    try { localStorage.setItem(STORAGE_KEY, internal); } catch {}
    // Sync URL param
    const u = new URL(window.location.href);
    u.searchParams.set('interval', internal);
    window.history.replaceState({}, '', u.toString());
  }, [internal]);

  useEffect(() => {
    if (value && value !== internal) setInternal(value);
  }, [value]);

  const setVal = (v: BillingInterval) => {
    setInternal(v);
    onChange?.(v);
  };

  return (
    <div className="inline-flex rounded-md border border-white/10 p-1 bg-black/30" role="group" aria-label="Billing interval">
      <Button
        size="sm"
        variant={internal === 'monthly' ? 'default' : 'ghost'}
        className={internal === 'monthly' ? 'bg-workbbench-purple text-white' : ''}
        onClick={() => setVal('monthly')}
        aria-pressed={internal === 'monthly'}
      >
        Monthly
      </Button>
      <Button
        size="sm"
        variant={internal === 'yearly' ? 'default' : 'ghost'}
        className={internal === 'yearly' ? 'bg-workbbench-purple text-white' : ''}
        onClick={() => setVal('yearly')}
        aria-pressed={internal === 'yearly'}
      >
        Yearly
      </Button>
    </div>
  );
}

export default PlanToggle;
