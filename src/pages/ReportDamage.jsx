import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import DamageReportForm from '@/components/go/DamageReportForm';
import PageHeader from '@/components/go/PageHeader';

export default function ReportDamage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [move, setMove] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await base44.entities.MoveRequest.get(id);
        setMove(m);
      } catch (err) {
        setError(err.message || 'Could not load this move.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (error || !move) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <AlertTriangle className="text-muted-foreground mb-3" size={48} />
        <h2 className="font-display font-bold text-lg mb-1">Move Not Found</h2>
        <p className="text-muted-foreground text-sm mb-4">{error || 'We could not load the move details.'}</p>
        <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/move/${id}`)} className="mb-3 -ml-2">
        <ArrowLeft size={16} className="mr-1" /> Back to Move
      </Button>

      <PageHeader
        title="Report Damaged or Missing Item"
        subtitle={`For move on ${move.move_date || 'N/A'} — ${move.pickup_address?.slice(0, 40) || ''}...`}
        icon={<AlertTriangle className="text-red-500" />}
      />

      {move.assigned_driver_name && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <span className="font-medium">Driver on record:</span> {move.assigned_driver_name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The assigned driver will be automatically flagged for review when you submit this report.
          </p>
        </div>
      )}

      <DamageReportForm
        move={move}
        user={user}
        onSubmitted={() => {}}
      />
    </div>
  );
}