import { useContext, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { accountContext } from '@/modules/context/account-context';

const QUICK_AMOUNTS_CENTS = [1000, 2500, 5000];

interface TopUpDialogProps {
  trigger: React.ReactNode;
}

export function TopUpDialog({ trigger }: TopUpDialogProps) {
  const account = useContext(accountContext);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleTopUp(amountCents: number) {
    if (!account) return;
    setError(null);
    setSubmitting(true);
    try {
      await account.accountService.topUp(amountCents);
      setAmount('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError('Enter an amount greater than $0.');
      return;
    }
    void handleTopUp(Math.round(dollars * 100));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top up balance</DialogTitle>
          <DialogDescription>Add funds to your charging wallet.</DialogDescription>
        </DialogHeader>

        <View className="flex-row gap-2">
          {QUICK_AMOUNTS_CENTS.map((cents) => (
            <Button
              key={cents}
              variant="secondary"
              size="sm"
              className="flex-1"
              onPress={() => void handleTopUp(cents)}
              disabled={submitting}
            >
              <Text>${(cents / 100).toFixed(0)}</Text>
            </Button>
          ))}
        </View>

        <View className="gap-1.5">
          <Label nativeID="topUpAmountLabel">Custom amount (USD)</Label>
          <Input
            aria-labelledby="topUpAmountLabel"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>

        {error ? (
          <Text variant="small" className="text-destructive">
            {error}
          </Text>
        ) : null}

        <DialogFooter>
          <Button onPress={handleSubmit} disabled={submitting}>
            <Text>{submitting ? 'Adding…' : 'Top Up'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
