import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { User, Mail, Loader2 } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-display font-bold mb-6">My Account</h1>

      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
          <User className="text-emerald-600" size={32} />
        </div>
        <div>
          <Label>Full Name</Label>
          <Input value={user?.full_name || ''} readOnly className="bg-gray-50" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user?.email || ''} readOnly className="bg-gray-50" />
        </div>
        <div>
          <Label>Role</Label>
          <Input value={user?.role || 'user'} readOnly className="bg-gray-50" />
        </div>
        <Button
          variant="outline"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => base44.auth.logout('/')}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}