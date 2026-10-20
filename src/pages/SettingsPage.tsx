import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useTransactions } from '@/hooks/useTransactions';
import {
  Settings,
  LogOut,
  User,
  FileSpreadsheet,
  Download,
  Landmark,
  Tags,
  CheckCircle2,
  Wallet,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppSettings();
  const { transactions } = useTransactions();

  // Initial balance settings state
  const [openingBalance, setOpeningBalance] = useState<number>(
    settings?.initial_opening_balance ?? 110000
  );
  const [openingDate, setOpeningDate] = useState<string>(
    settings?.initial_balance_date || '2026-01-01'
  );
  const [isSavingBalance, setIsSavingBalance] = useState(false);

  // CSV Export Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'custom'>('all');
  const [exportStartDate, setExportStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [exportEndDate, setExportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  React.useEffect(() => {
    if (settings) {
      if (settings.initial_opening_balance !== undefined) {
        setOpeningBalance(Number(settings.initial_opening_balance));
      }
      if (settings.initial_balance_date) {
        setOpeningDate(settings.initial_balance_date.slice(0, 10));
      }
    }
  }, [settings]);

  const handleSaveInitialBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBalance(true);
    try {
      await updateSettings({
        initial_opening_balance: openingBalance,
        initial_balance_date: openingDate,
      });
      toast.success('Starting opening balance updated successfully');
    } catch {
      toast.error('Failed to update opening balance');
    } finally {
      setIsSavingBalance(false);
    }
  };

  const handleExportCSV = () => {
    let filtered = [...transactions];
    if (exportScope === 'custom') {
      filtered = filtered.filter((t) => {
        const d = t.transaction_date.slice(0, 10);
        return d >= exportStartDate && d <= exportEndDate;
      });
    }

    if (filtered.length === 0) {
      toast.error('No transactions found in selected date range for export');
      return;
    }

    // Build CSV Content
    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Category',
      'Subcategory',
      'Amount (INR)',
      'Account',
      'Payment Mode',
      'Description',
      'Notes',
    ];

    const rows = filtered.map((t) => [
      t.id,
      t.transaction_date,
      t.type,
      `"${t.categories?.name || ''}"`,
      `"${t.subcategories?.name || ''}"`,
      t.amount,
      `"${t.accounts?.account_name || ''}"`,
      t.payment_mode || '',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `MoneyTracker_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filtered.length} transactions to CSV`);
    setExportModalOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch {
      toast.error('An error occurred during logout');
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Preferences</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your account profile, starting balance, exports, and security
        </p>
      </div>

      {/* Backend Status Card */}
      <Card className="p-4 flex items-center justify-between border-border/80">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Supabase Authentication & Cloud Database Active
            </p>
            <p className="text-xs text-muted-foreground">
              Protected by PostgreSQL Row-Level Security (RLS). You only have access to your own personal financial data.
            </p>
          </div>
        </div>
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
          User Isolated
        </Badge>
      </Card>

      {/* Starting Opening Balance Setting */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Initial Starting Balance</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Set the baseline opening balance prior to your first recorded month. The closing balance of each month automatically becomes the opening balance of the next month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveInitialBalance} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="init_balance" className="text-xs font-semibold">
                  Initial Starting Balance (₹)
                </Label>
                <Input
                  id="init_balance"
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  className="h-10 text-base font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="init_date" className="text-xs font-semibold">
                  Starting Effective Date
                </Label>
                <Input
                  id="init_date"
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <Button type="submit" size="sm" disabled={isSavingBalance} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              {isSavingBalance ? 'Updating...' : 'Save Starting Balance'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Data Management & Export Section */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Export & Data Management</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Download your personal financial records as CSV spreadsheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Export Financial Records</p>
              <p className="text-xs text-muted-foreground">
                Download transactions, categories, and payment modes into CSV
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation Links to Accounts & Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/accounts">
          <Card className="p-4 hover:border-primary/50 transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Manage Bank Accounts</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Savings, Current, and Cash Wallets
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/categories">
          <Card className="p-4 hover:border-primary/50 transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Manage Categories</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Custom expense & income categories and subcategories
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Profile Info */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">User Profile</CardTitle>
          </div>
          <CardDescription className="text-xs">Your registered account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-border/60">
            <span className="text-xs text-muted-foreground font-medium">Email Address</span>
            <span className="text-xs sm:text-sm font-semibold">{user?.email}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2">
            <span className="text-xs text-muted-foreground font-medium">Full Name</span>
            <span className="text-xs sm:text-sm font-semibold">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Account Logout */}
      <Card className="border-destructive/30 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-destructive">
            <Settings className="h-5 w-5" />
            <CardTitle className="text-base font-semibold">Session & Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="w-full sm:w-auto gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out of My Money Tracker
          </Button>
        </CardContent>
      </Card>

      {/* CSV Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Financial Transactions</DialogTitle>
            <DialogDescription>
              Select date range for downloading your CSV spreadsheet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Export Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={exportScope === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportScope('all')}
                >
                  All Transactions ({transactions.length})
                </Button>
                <Button
                  type="button"
                  variant={exportScope === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportScope('custom')}
                >
                  Custom Range
                </Button>
              </div>
            </div>

            {exportScope === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="exp_start" className="text-xs font-semibold">
                    Start Date
                  </Label>
                  <Input
                    id="exp_start"
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="exp_end" className="text-xs font-semibold">
                    End Date
                  </Label>
                  <Input
                    id="exp_end"
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setExportModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExportCSV} className="gap-1.5">
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
