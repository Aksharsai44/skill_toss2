import { useState } from 'react';
import {
  Leaf, Monitor, Zap, TreePine, AlertTriangle, Lightbulb, TrendingUp, BarChart2,
  Megaphone, Users, Send, Target, Search, XCircle, Database, Plus, Check
} from 'lucide-react';
import { PageHeader, Card, CardHeader } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useLmsData } from '@/lib/lmsDataContext';

export function SustainabilityDashboard() {
  return (
    <div>
      <PageHeader title="Sustainability Dashboard" subtitle="Track digital adoption and carbon footprint reduction" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Paper Saved" value="1.2M pages" icon={Leaf} color="success" />
        <StatCard label="Digital Adoption" value="89%" icon={Monitor} color="primary" />
        <StatCard label="Energy Usage" value="-12%" icon={Zap} color="warning" />
        <StatCard label="Trees Saved" value="142" icon={TreePine} color="accent" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="h-64 flex flex-col">
          <CardHeader title="Digital Adoption Trend" subtitle="Paper vs. Digital processes over time" />
          <div className="flex-1 flex items-center justify-center bg-ink-50 rounded-b-xl">
            <p className="text-ink-400 font-medium">Digital Adoption Chart Placeholder</p>
          </div>
        </Card>
        <Card className="h-64 flex flex-col">
          <CardHeader title="Carbon Reduction" subtitle="Estimated CO2 emissions avoided" />
          <div className="flex-1 flex items-center justify-center bg-ink-50 rounded-b-xl">
            <p className="text-ink-400 font-medium">Carbon Reduction Chart Placeholder</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ExecutiveDecisionCenter() {
  const { setFeedback } = useLmsData();
  const [recommendations, setRecommendations] = useState([
    { id: '1', type: 'Growth', message: 'Expand coaching programs in South region due to 24% increase in inquiries.', impact: 'High' },
    { id: '2', type: 'Risk', message: '3 institutions show declining attendance rates in the last 2 weeks.', impact: 'Critical' },
    { id: '3', type: 'Cost', message: 'Consolidate redundant Zoom licenses to save ₹45k monthly.', impact: 'Medium' }
  ]);

  const handleApply = (id: string, type: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== id));
    setFeedback({ kind: 'success', message: `${type} recommendation applied successfully.` });
  };

  return (
    <div>
      <PageHeader title="Executive Decision Center" subtitle="AI-driven strategic recommendations and alerts" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Strategic Alerts" value="3" icon={AlertTriangle} color="error" />
        <StatCard label="AI Suggestions" value="12" icon={Lightbulb} color="warning" />
        <StatCard label="Overall Growth" value="+18%" icon={TrendingUp} color="success" />
        <StatCard label="Org Health Score" value="92/100" icon={BarChart2} color="primary" />
      </div>
      <Card>
        <CardHeader title="AI Priority Suggestions" subtitle="Recommended actions across all institutions" />
        <div className="p-4 space-y-4">
          {recommendations.map(rec => (
            <div key={rec.id} className="flex gap-4 p-4 border border-ink-100 rounded-xl hover:bg-ink-50 transition">
              <div className="shrink-0 mt-1">
                {rec.type === 'Risk' ? <AlertTriangle className="w-5 h-5 text-error-600" /> : 
                 rec.type === 'Cost' ? <TrendingUp className="w-5 h-5 text-warning-600" /> : 
                 <Lightbulb className="w-5 h-5 text-success-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-ink-900">{rec.type} Recommendation</span>
                  <Badge variant={rec.impact === 'Critical' ? 'error' : rec.impact === 'High' ? 'success' : 'warning'}>{rec.impact} Impact</Badge>
                </div>
                <p className="text-ink-700 text-sm mb-3">{rec.message}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApply(rec.id, rec.type)}>Apply Strategy</Button>
                  <Button variant="ghost" size="sm" onClick={() => setRecommendations(prev => prev.filter(r => r.id !== rec.id))}>Dismiss</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function GlobalCampaignManager() {
  const { setFeedback } = useLmsData();
  const [campaigns] = useState([
    { id: '1', name: 'Winter Admission Drive', audience: 'All Leads', status: 'active', sent: 1200, openRate: 45 },
    { id: '2', name: 'Fee Reminder Notice', audience: 'Parents (Defaulters)', status: 'scheduled', sent: 0, openRate: 0 },
    { id: '3', name: 'New AI Features Launch', audience: 'All Teachers', status: 'completed', sent: 350, openRate: 82 },
  ]);

  return (
    <div>
      <PageHeader 
        title="Global Announcement Campaign Manager" 
        subtitle="Schedule campaigns and analyze engagement across all institutions" 
        actions={<Button icon={Plus} onClick={() => setFeedback({ kind: 'success', message: 'New global campaign drafted.' })}>Create Campaign</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Campaigns" value="2" icon={Megaphone} color="primary" />
        <StatCard label="Total Audience" value="45k" icon={Users} color="accent" />
        <StatCard label="Messages Sent" value="12.4k" icon={Send} color="success" />
        <StatCard label="Avg Open Rate" value="68%" icon={Target} color="warning" />
      </div>
      <Card>
        <CardHeader title="Campaigns" />
        <DataTable
          columns={[
            { key: 'name', label: 'Campaign Name', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'audience', label: 'Target Audience' },
            { key: 'sent', label: 'Sent', render: (r) => r.sent.toLocaleString() },
            { key: 'openRate', label: 'Open Rate', render: (r) => `${r.openRate}%` },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status as string} /> },
          ]}
          data={campaigns}
        />
      </Card>
    </div>
  );
}

export function DataQualityMonitoring() {
  const { setFeedback } = useLmsData();
  const [alerts, setAlerts] = useState([
    { id: '1', issue: 'Duplicate Student Records', location: 'Tech Inst.', count: 12, severity: 'High' },
    { id: '2', issue: 'Missing Phone Numbers', location: 'Acme School', count: 45, severity: 'Medium' },
    { id: '3', issue: 'Invalid Email Formats', location: 'Global College', count: 8, severity: 'Low' },
  ]);

  const handleReview = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    setFeedback({ kind: 'success', message: 'Data quality issue marked as resolved.' });
  };

  return (
    <div>
      <PageHeader title="Data Quality Monitoring" subtitle="Detect duplicate records, missing info, and invalid data formats" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Data Quality Score" value="94/100" icon={Database} color="success" />
        <StatCard label="Duplicate Records" value="12" icon={Users} color="error" />
        <StatCard label="Missing Info Alerts" value="45" icon={Search} color="warning" />
        <StatCard label="Invalid Data Fields" value="8" icon={XCircle} color="accent" />
      </div>
      <Card>
        <CardHeader title="Data Quality Alerts" subtitle="Action required to fix records" />
        <DataTable
          columns={[
            { key: 'issue', label: 'Issue Detected', render: (r) => <span className="font-medium text-ink-900">{r.issue}</span> },
            { key: 'location', label: 'Institution' },
            { key: 'count', label: 'Records Affected' },
            { key: 'severity', label: 'Severity', render: (r) => (
              <Badge variant={r.severity === 'High' ? 'error' : r.severity === 'Medium' ? 'warning' : 'primary'}>{r.severity}</Badge>
            ) },
            { key: 'action', label: 'Action', render: (r) => (
              <button onClick={() => handleReview(r.id)} className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
                <Check className="w-4 h-4" /> Resolve
              </button>
            ) },
          ]}
          data={alerts}
        />
      </Card>
    </div>
  );
}
