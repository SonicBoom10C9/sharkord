import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@sharkord/ui';
import { Copy, RefreshCw } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const RecoveryCodes = memo(() => {
  const { t } = useTranslation('settings');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);

  const fetchCount = useCallback(async () => {
    const trpc = getTRPCClient();
    const result = await trpc.users.getRecoveryCodeCount.query();
    setRemaining(result.remaining);
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const onRegenerate = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: t('regenerateConfirmTitle'),
      message: t('regenerateConfirmMsg'),
      confirmLabel: t('regenerateConfirmBtn')
    });

    if (!confirmed) return;

    const trpc = getTRPCClient();

    try {
      const result = await trpc.users.regenerateRecoveryCodes.mutate();
      setCodes(result.codes);
      setRemaining(result.codes.length);
      toast.success(t('recoveryCodesGenerated'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedRegenerateRecoveryCodes')));
    }
  }, [t]);

  const onCopy = useCallback(() => {
    if (codes) {
      navigator.clipboard.writeText(codes.join('\n'));
      toast.success(t('codesCopied'));
    }
  }, [codes, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('recoveryCodesTitle')}</CardTitle>
        <CardDescription>{t('recoveryCodesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {remaining !== null && !codes && (
          <p className="text-sm text-muted-foreground">
            {remaining > 0
              ? t('recoveryCodesRemaining', { count: remaining })
              : t('recoveryCodesNone')}
          </p>
        )}

        {codes && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-muted p-4 rounded-md break-all">
              {codes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={onCopy}>
              <Copy className="h-4 w-4" />
              {t('copyCodesBtn')}
            </Button>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onRegenerate}>
            <RefreshCw className="h-4 w-4" />
            {t('regenerateBtn')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { RecoveryCodes };
