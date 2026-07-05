import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { User, Mail, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PullToRefresh from '@/components/go/PullToRefresh';
import StripeConnectCard from '@/components/go/StripeConnectCard';
import LoyaltyCard from '@/components/go/LoyaltyCard';
import ReferralCard from '@/components/go/ReferralCard';
import DriverProfileDashboard from '@/components/go/DriverProfileDashboard';

export default function Profile() {
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const { user, checkUserAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { toast } = useToast();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke('delete-user-account', {});
      toast({ title: 'Account deleted', description: 'Your account and personal data have been permanently removed.' });
      base44.auth.logout('/');
    } catch (err) {
      toast({ title: 'Deletion failed', description: err.message || 'Please try again or contact support.', variant: 'destructive' });
      setDeleting(false);
    }
  };

  return (
    <PullToRefresh onRefresh={async () => { await checkUserAuth(); }} scrollRef={scrollRef}>
    <div className="max-w-md mx-auto">
      <button onClick={() => navigate(-1)} aria-label="Go back" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 min-h-[44px]"><ArrowLeft size={16} /> Back</button>
      <h1 className="text-2xl font-display font-bold mb-6">My Account</h1>

      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
          <User className="text-emerald-600" size={32} />
        </div>
        <div>
          <Label>Full Name</Label>
          <Input value={user?.full_name || ''} readOnly className="bg-muted" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user?.email || ''} readOnly className="bg-muted" />
        </div>
        <div>
          <Label>Role</Label>
          <Input value={user?.role || 'user'} readOnly className="bg-muted" />
        </div>
        <Button
          variant="outline"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => base44.auth.logout('/')}
        >
          Sign Out
        </Button>
      </div>

      <DriverProfileDashboard />
      <LoyaltyCard />
      <ReferralCard />
      <StripeConnectCard />

      <div className="bg-card border border-destructive/30 rounded-2xl p-6 mt-6">
        <h2 className="text-lg font-display font-bold text-destructive mb-2">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full min-h-[44px]">
              <Trash2 size={16} className="mr-2" /> Delete My Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Your Account</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>This will permanently delete all your personal data, saved addresses, loyalty points, and move history. Active moves may be cancelled. This action cannot be undone.</p>
                  <div>
                    <p className="mb-2">Type <strong className="text-destructive">DELETE</strong> to confirm:</p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                      placeholder="DELETE"
                      className="uppercase"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting || confirmText !== 'DELETE'}
                onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              >
                {deleting ? <><Loader2 size={14} className="mr-1 animate-spin" /> Deleting...</> : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
    </PullToRefresh>
  );
}