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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10 mt-2 min-h-[44px]">
              <Trash2 size={16} className="mr-2" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>This will permanently and irreversibly delete:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Your account and login credentials</li>
                    <li>All move requests and history</li>
                    <li>Your driver profile and documents (if applicable)</li>
                    <li>All pending and completed payouts</li>
                    <li>Loyalty points and referral records</li>
                  </ul>
                  <p className="font-medium text-destructive">This action cannot be undone.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
                onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              >
                {deleting ? <><Loader2 size={14} className="mr-1 animate-spin" /> Deleting...</> : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <DriverProfileDashboard />
      <LoyaltyCard />
      <ReferralCard />
      <StripeConnectCard />
    </div>
    </PullToRefresh>
  );
}