import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';
import { useOutletContext } from 'react-router-dom';
import {
  DollarSign, Fuel, Milestone, Wrench, FileQuestion, Receipt, Loader2,
  TrendingUp, Calculator, Calendar, ArrowLeft, Download,
} from 'lucide-react';
import { format, parseISO, getQuarter, getYear, subQuarters } from 'date-fns';

const EXPENSE_ICONS = {
  gas: Fuel,
  tolls: Milestone,
  maintenance: Wrench,
  other: FileQuestion,
};

const EXPENSE_COLORS = {
  gas: 'text-orange-500',
  tolls: 'text-blue-500',
  maintenance: 'text-purple-500',
  other: 'text-gray-500',
};

const STATUS_STYLES = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  approved: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
  denied: 'bg-red-500/10 text-red-700 dark:text-red-300',
  estimated: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
};

// 2025 self-employment tax rate: 15.3% (12.4% Social Security + 2.9% Medicare)
const SE_TAX_RATE = 0.153;
// Standard mileage deduction rate (IRS 2025): $0.70/mile
const STD_MILEAGE_RATE = 0.70;
// Deductible portion of SE tax: 50% of employer portion
const SE_TAX_DEDUCTION = 0.5;

const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DriverExpenses() {
  const { scrollRef } = useOutletContext();
  const { user } = useAuth();
  const [selectedQuarter, setSelectedQuarter] = useState('all');

  const { data: driverProfile } = useQuery({
    queryKey: ['myDriverProfile', user?.id],
    queryFn: () => base44.entities.DriverProfile.filter({ email: user.email }).then((r) => r[0] || null),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['driverExpenses', driverProfile?.id],
    queryFn: () => base44.entities.ExpenseReceipt.filter({ driver_profile_id: driverProfile.id }, '-created_date', 500),
    enabled: !!driverProfile?.id,
    staleTime: 60 * 1000,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['driverPayouts', driverProfile?.id],
    queryFn: () => base44.entities.DriverPayout.filter({ driver_profile_id: driverProfile.id }, '-created_date', 500),
    enabled: !!driverProfile?.id,
    staleTime: 60 * 1000,
  });

  // Filter by quarter
  const filteredReceipts = useMemo(() => {
    if (selectedQuarter === 'all') return receipts;
    const [yearStr, qStr] = selectedQuarter.split('-Q');
    const year = parseInt(yearStr);
    const quarter = parseInt(qStr);
    return receipts.filter((r) => {
      const d = new Date(r.created_date);
      return getYear(d) === year && getQuarter(d) === quarter;
    });
  }, [receipts, selectedQuarter]);

  const filteredPayouts = useMemo(() => {
    if (selectedQuarter === 'all') return payouts;
    const [yearStr, qStr] = selectedQuarter.split('-Q');
    const year = parseInt(yearStr);
    const quarter = parseInt(qStr);
    return payouts.filter((p) => {
      const d = new Date(p.created_date);
      return getYear(d) === year && getQuarter(d) === quarter;
    });
  }, [payouts, selectedQuarter]);

  const stats = useMemo(() => {
    const totalEarnings = filteredPayouts.reduce((s, p) => s + (p.amount || 0), 0);
    const totalExpenses = filteredReceipts
      .filter((r) => r.status === 'approved' || r.status === 'estimated')
      .reduce((s, r) => s + (r.status === 'approved' ? (r.approved_amount || r.amount) : (r.estimated_amount || r.amount)), 0);

    const byCategory = {
      gas: 0,
      tolls: 0,
      maintenance: 0,
      other: 0,
    };
    for (const r of filteredReceipts) {
      if (r.status === 'approved' || r.status === 'estimated') {
        const amount = r.status === 'approved' ? (r.approved_amount || r.amount) : (r.estimated_amount || r.amount);
        byCategory[r.expense_type] = (byCategory[r.expense_type] || 0) + amount;
      }
    }

    const netIncome = totalEarnings - totalExpenses;
    const seTax = netIncome > 0 ? netIncome * SE_TAX_RATE : 0;
    const seTaxDeduction = seTax * SE_TAX_DEDUCTION;
    const taxableIncome = Math.max(0, netIncome - seTaxDeduction);
    const estimatedTax = seTax + (taxableIncome > 0 ? taxableIncome * 0.12 : 0); // 12% effective income tax rate

    return {
      totalEarnings,
      totalExpenses,
      netIncome,
      byCategory,
      seTax,
      taxableIncome,
      estimatedTax,
      pendingCount: filteredReceipts.filter((r) => r.status === 'pending').length,
    };
  }, [filteredReceipts, filteredPayouts]);

  // Build quarter options
  const quarterOptions = useMemo(() => {
    const now = new Date();
    const options = [{ value: 'all', label: 'All Time' }];
    for (let i = 0; i < 8; i++) {
      const d = subQuarters(now, i);
      const y = getYear(d);
      const q = getQuarter(d);
      options.push({ value: `${y}-Q${q}`, label: `Q${q} ${y}` });
    }
    return options;
  }, []);

  const handleExport = () => {
    const rows = [
      ['Date', 'Type', 'Amount', 'Status', 'Approved Amount', 'Description'],
      ...filteredReceipts.map((r) => [
        format(parseISO(r.created_date), 'MMM d, yyyy'),
        r.expense_type,
        r.amount.toFixed(2),
        r.status,
        (r.approved_amount || 0).toFixed(2),
        r.description || '',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-expenses-${selectedQuarter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={async () => { /* react-query refetch */ }}>
      <div className="max-w-2xl mx-auto">
        <PageHeader title="Expense & Tax Dashboard" isRoot={false} />

        {/* Quarter selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {quarterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedQuarter(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] ${
                selectedQuarter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border text-muted-foreground hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border rounded-2xl p-3 md:p-5 text-center">
            <DollarSign className="mx-auto text-emerald-500 mb-1" size={20} />
            <p className="text-xl md:text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">{fmt(stats.totalEarnings)}</p>
            <p className="text-xs text-muted-foreground">Earnings</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 md:p-5 text-center">
            <Receipt className="mx-auto text-orange-500 mb-1" size={20} />
            <p className="text-xl md:text-2xl font-display font-bold text-orange-500">{fmt(stats.totalExpenses)}</p>
            <p className="text-xs text-muted-foreground">Expenses</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 md:p-5 text-center">
            <TrendingUp className="mx-auto text-blue-500 mb-1" size={20} />
            <p className="text-xl md:text-2xl font-display font-bold">{fmt(stats.netIncome)}</p>
            <p className="text-xs text-muted-foreground">Net Income</p>
          </div>
        </div>

        {/* Tax estimate */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={20} className="text-blue-500" />
            <h2 className="font-display font-bold text-lg">Tax Estimate</h2>
            <Badge variant="secondary" className="ml-auto text-xs">Estimated</Badge>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Income</span>
              <span className="font-medium">{fmt(stats.netIncome)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Self-Employment Tax (15.3%)</span>
              <span className="font-medium text-red-600 dark:text-red-400">{fmt(stats.seTax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxable Income (after SE deduction)</span>
              <span className="font-medium">{fmt(stats.taxableIncome)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-display font-bold">Estimated Total Tax</span>
              <span className="font-display font-black text-lg text-red-600 dark:text-red-400">{fmt(stats.estimatedTax)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Includes self-employment tax (15.3%) plus estimated income tax. Actual liability may vary based on deductions and credits. Consult a tax professional.
            </p>
          </div>
        </div>

        {/* Expense breakdown by category */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <h2 className="font-display font-bold text-lg mb-4">Expense Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(stats.byCategory).map(([type, amount]) => {
              const Icon = EXPENSE_ICONS[type] || Receipt;
              const color = EXPENSE_COLORS[type] || 'text-gray-500';
              const pct = stats.totalExpenses > 0 ? (amount / stats.totalExpenses) * 100 : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={color} />
                    <span className="text-sm font-medium capitalize flex-1">{type}</span>
                    <span className="text-sm font-medium">{fmt(amount)}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Export button */}
        <Button variant="outline" className="w-full mb-6 min-h-[44px]" onClick={handleExport}>
          <Download size={16} className="mr-1" /> Export to CSV
        </Button>

        {/* Receipt history */}
        <div className="bg-card border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Receipt History</h2>
            {stats.pendingCount > 0 && (
              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">{stats.pendingCount} pending</Badge>
            )}
          </div>
          {filteredReceipts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No receipts for this period.</p>
          ) : (
            <div className="space-y-2">
              {filteredReceipts.map((r) => {
                const Icon = EXPENSE_ICONS[r.expense_type] || Receipt;
                const color = EXPENSE_COLORS[r.expense_type] || 'text-gray-500';
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Icon size={18} className={color} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize">{r.expense_type} — {fmt(r.amount)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(parseISO(r.created_date), 'MMM d, yyyy')}
                        {r.description ? ` · ${r.description}` : ''}
                      </p>
                    </div>
                    <Badge className={STATUS_STYLES[r.status]}>{r.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}