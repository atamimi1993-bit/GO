import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { User, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PullToRefresh from '@/components/go/PullToRefresh';
import DriverPaymentInfo from '@/components/go/DriverPaymentInfo';

export default function Profile() {
  const navigate = useNavigate();
  const { scrollRef } = useOutletContext();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;

  return (
    <PullToRefresh onRefresh={async () => { const u = await base44.auth.me(); setUser(u); }} scrollRef={scrollRef}>
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
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 mt-2">
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete your account and all associated data including moves, driver profile, and payouts. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { base44.auth.deleteAccount().catch(() => {}); base44.auth.logout('/'); }}>
                {deleting ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <DriverPaymentInfo />
    </div>
    </PullToRefresh>
  );
}