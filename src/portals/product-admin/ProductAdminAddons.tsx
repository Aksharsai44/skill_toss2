import { useState } from 'react';
import {
  Sparkles, Activity, Users, FileText, Zap, DollarSign, Target,
  Clock, ShieldAlert, CheckCircle, Map, Layout, Plus, Download
} from 'lucide-react';
import { PageHeader, Card, CardHeader } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useLmsData } from '@/lib/lmsDataContext';

export function AiFeatureLab() {
  const { setFeedback } = useLmsData();
  const [betaPrograms] = useState([
    { id: '1', name: 'AI Auto-Grader V2', status: 'active', pilotInstitutions: 12, feedbackScore: 4.8, type: 'Assessment' },
    { id: '2', name: 'Predictive Dropout Alerts', status: 'planning', pilotInstitutions: 5, feedbackScore: 0, type: 'Analytics' },
    { id: '3', name: 'AI Voice Tutor', status: 'completed', pilotInstitutions: 20, feedbackScore: 4.5, type: 'Learning' },
  ]);

  const handleLaunch = () => {
    setFeedback({ kind: 'success', message: 'New Beta Program created successfully!' });
  };

  return (
    <div>
      <PageHeader 
        title="AI Feature Experimentation Lab" 
        subtitle="Manage beta programs, pilot institutions, and collect AI feedback" 
        actions={
          <Button icon={Plus} onClick={handleLaunch}>New Beta Program</Button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Betas" value="4" icon={Activity} color="primary" />
        <StatCard label="Pilot Institutions" value="38" icon={Users} color="accent" />
        <StatCard label="Avg AI Score" value="4.6/5" icon={Sparkles} color="success" />
        <StatCard label="Reports Auto-Generated" value="12" icon={FileText} color="warning" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Beta vs Production Performance" subtitle="Accuracy of AI models over time" />
          <div className="p-5 h-64 flex items-center justify-center bg-ink-50 rounded-b-xl border-t border-ink-100">
            {/* Mock chart placeholder */}
            <p className="text-ink-400 font-medium">Performance Chart Visualization</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Pilot Feedback" subtitle="Recent comments from institutions" />
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="p-3 bg-ink-50 rounded-xl text-sm">
                <p className="font-semibold text-ink-900 mb-1">"The new AI Grader saves us hours!"</p>
                <p className="text-xs text-ink-500">- Acme School District</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Beta Programs" />
        <DataTable
          columns={[
            { key: 'name', label: 'Program Name' },
            { key: 'type', label: 'Category' },
            { key: 'pilotInstitutions', label: 'Pilots' },
            { key: 'feedbackScore', label: 'Score', render: (r) => r.feedbackScore > 0 ? `${r.feedbackScore}/5` : 'N/A' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status as string} /> },
          ]}
          data={betaPrograms}
        />
      </Card>
    </div>
  );
}

export function LicenseOptimizer() {
  const { setFeedback } = useLmsData();
  const [unusedModules, setUnusedModules] = useState([
    { id: '1', institution: 'Acme School', module: 'Advanced Reports', daysUnused: 45, potentialSaving: 5000 },
    { id: '2', institution: 'Tech Inst.', module: 'Biometric Attendance', daysUnused: 120, potentialSaving: 12000 },
  ]);

  const handleDowngrade = (id: string, institution: string) => {
    setUnusedModules(prev => prev.filter(m => m.id !== id));
    setFeedback({ kind: 'success', message: `License downgraded for ${institution}. Savings applied!` });
  };

  return (
    <div>
      <PageHeader title="License Usage Optimizer" subtitle="Detect unused modules and provide cost-saving recommendations" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Unused Modules" value="14" icon={Layout} color="warning" />
        <StatCard label="Potential Savings" value="₹45k" icon={DollarSign} color="success" />
        <StatCard label="Optimization Score" value="82%" icon={Target} color="primary" />
        <StatCard label="Active Licenses" value="1,240" icon={CheckCircle} color="accent" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader title="Feature Utilization Heatmap" subtitle="Most to least used features" />
          <div className="p-4 space-y-2">
            {[
              { name: 'Attendance', usage: 98 },
              { name: 'Live Classes', usage: 85 },
              { name: 'AI Quiz Gen', usage: 42 },
              { name: 'Payroll', usage: 12 },
            ].map(f => (
              <div key={f.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{f.name}</span>
                  <span>{f.usage}%</span>
                </div>
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500" style={{ width: `${f.usage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Cost-Saving Recommendations" subtitle="AI suggested actions" />
          <div className="p-4 space-y-3">
            {unusedModules.map(m => (
              <div key={m.id} className="flex justify-between items-center p-3 border border-ink-100 rounded-xl">
                <div>
                  <p className="font-semibold text-ink-900 text-sm">{m.institution}</p>
                  <p className="text-xs text-ink-500">Downgrade {m.module} (Unused for {m.daysUnused} days)</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success">Save ₹{m.potentialSaving}</Badge>
                  <Button variant="outline" size="sm" onClick={() => handleDowngrade(m.id, m.institution)}>Downgrade</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function SlaDashboard() {
  const { setFeedback } = useLmsData();
  return (
    <div>
      <PageHeader 
        title="SLA Monitoring Dashboard" 
        subtitle="Track response times, resolution tracking, and escalations" 
        actions={<Button variant="outline" icon={Download} onClick={() => setFeedback({ kind: 'info', message: 'Exporting SLA report...' })}>Export Report</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active SLA Timers" value="24" icon={Clock} color="warning" />
        <StatCard label="Avg Response Time" value="14m" icon={Zap} color="success" />
        <StatCard label="Resolution Rate" value="94%" icon={CheckCircle} color="primary" />
        <StatCard label="Escalation Alerts" value="2" icon={ShieldAlert} color="error" />
      </div>
      <Card>
        <CardHeader title="Active Escalations" />
        <div className="p-4 flex items-center justify-center h-32 bg-ink-50 rounded-b-xl">
          <p className="text-ink-500 text-sm">No critical escalations at this time.</p>
        </div>
      </Card>
    </div>
  );
}

export function RoadmapManager() {
  const { setFeedback } = useLmsData();
  const [roadmap] = useState([
    { id: '1', feature: 'AI Proctoring Integration', status: 'In Progress', priority: 'High', votes: 145, progress: 65 },
    { id: '2', feature: 'Global SSO', status: 'Planned', priority: 'Medium', votes: 89, progress: 0 },
    { id: '3', feature: 'Advanced Custom Reports', status: 'Completed', priority: 'High', votes: 210, progress: 100 },
  ]);

  return (
    <div>
      <PageHeader 
        title="Product Roadmap Manager" 
        subtitle="Manage feature releases, customer voting, and dev progress" 
        actions={<Button icon={Plus} onClick={() => setFeedback({ kind: 'success', message: 'Feature added to Roadmap.' })}>Add Feature</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Planned Features" value="12" icon={Map} color="primary" />
        <StatCard label="In Progress" value="4" icon={Activity} color="warning" />
        <StatCard label="Released (Q3)" value="8" icon={CheckCircle} color="success" />
        <StatCard label="Total Votes" value="1,204" icon={Users} color="accent" />
      </div>
      <Card>
        <CardHeader title="Development Roadmap" />
        <DataTable
          columns={[
            { key: 'feature', label: 'Feature Name', render: (r) => <span className="font-medium">{r.feature}</span> },
            { key: 'priority', label: 'Priority', render: (r) => (
              <Badge variant={r.priority === 'High' ? 'error' : 'warning'}>{r.priority as 'error' | 'warning'}</Badge>
            )},
            { key: 'votes', label: 'Customer Votes', render: (r) => `${r.votes} votes` },
            { key: 'progress', label: 'Progress', render: (r) => (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden w-24">
                  <div className="h-full bg-primary-500" style={{ width: `${r.progress}%` }} />
                </div>
                <span className="text-xs text-ink-500">{r.progress}%</span>
              </div>
            ) },
            { key: 'status', label: 'Status' },
          ]}
          data={roadmap}
        />
      </Card>
    </div>
  );
}
