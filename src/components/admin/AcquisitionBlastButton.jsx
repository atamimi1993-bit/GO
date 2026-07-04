import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Rocket, Loader2, CheckCircle2, Target, Users, Truck } from 'lucide-react';

export default function AcquisitionBlastButton() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('daily-acquisition-blast', {
        target_leads: 50,
        target_drivers: 50,
      });
      setResult(res.data);
      const leadGoal = res.data?.leads?.goal_met;
      const driverGoal = res.data?.drivers?.goal_met;
      toast({
        title: leadGoal && driverGoal ? 'Acquisition blast complete! 🎯' : 'Acquisition blast finished',
        description: `${res.data?.leads?.found || 0} leads and ${res.data?.drivers?.found || 0} drivers found.`,
      });
    } catch (err) {
      toast({ title: 'Acquisition blast failed', description: err.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-violet-500 rounded-xl p-2.5 flex items-center justify-center">
          <Rocket className="text-white" size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg">Daily Acquisition Blast</h2>
          <p className="text-muted-foreground text-sm">Find 50 new leads + 50 CDL/certified drivers across rotating US markets. Runs automatically every day at 8am.</p>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="border rounded-xl p-3 bg-background">
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-emerald-500" />
              <span className="text-xs font-medium">Leads Found</span>
              {result.leads?.goal_met && <Badge className="ml-auto bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]">Goal met</Badge>}
            </div>
            <p className="text-2xl font-display font-bold">{result.leads?.found || 0}<span className="text-sm text-muted-foreground">/{result.leads?.target || 50}</span></p>
            <p className="text-xs text-muted-foreground mt-1">{result.leads?.created || 0} saved to pipeline</p>
          </div>
          <div className="border rounded-xl p-3 bg-background">
            <div className="flex items-center gap-2 mb-1">
              <Truck size={14} className="text-amber-500" />
              <span className="text-xs font-medium">Drivers Found</span>
              {result.drivers?.goal_met && <Badge className="ml-auto bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">Goal met</Badge>}
            </div>
            <p className="text-2xl font-display font-bold">{result.drivers?.found || 0}<span className="text-sm text-muted-foreground">/{result.drivers?.target || 50}</span></p>
            <p className="text-xs text-muted-foreground mt-1">{result.driver_locations?.length || 0} markets searched</p>
          </div>
        </div>
      )}

      <Button onClick={handleRun} disabled={running} className="w-full bg-violet-500 hover:bg-violet-600 min-h-[44px]">
        {running ? (
          <><Loader2 size={16} className="animate-spin mr-2" /> Finding leads & drivers...</>
        ) : result ? (
          <><Rocket size={16} className="mr-2" /> Run Another Blast</>
        ) : (
          <><Rocket size={16} className="mr-2" /> Run Acquisition Blast Now</>
        )}
      </Button>
    </div>
  );
}