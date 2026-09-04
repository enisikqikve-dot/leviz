'use client';

import { Flag, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { reportVehicleAction } from '@/features/reports/actions';
import { REPORT_REASONS } from '@/features/reports/constants';

export function ReportDialog({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations('admin.reports');

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const result = await reportVehicleAction({ vehicleId, reason, details });
    setSending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setOpen(false);
    setReason('');
    setDetails('');
    toast.success(t('reportSent'));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <Flag className="size-3.5" aria-hidden />
          {t('report')}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('reportTitle')}</DialogTitle>
          <DialogDescription>{t('reportHint')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-reason">{t('reason')}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="report-reason" className="h-11 w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`reasons.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-details">{t('details')}</Label>
            <textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
          </div>

          <Button
            size="lg"
            className="h-11 w-full"
            onClick={send}
            disabled={sending || !reason}
          >
            {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {t('submitReport')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
