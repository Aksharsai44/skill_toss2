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
import { Modal } from '@/components/ui/Modal';
import { useLmsData } from '@/lib/lmsDataContext';
import { FileText, Shield, UserX, Settings2, Palette, ShieldAlert } from 'lucide-react';

export function AuditLogs() {
  const { state } = useLmsData();

  return (
    <div>
      <PageHeader title="Global Audit Logs" subtitle="Read-only compliance logs for critical system actions" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Logs (30d)" value="14.2k" icon={FileText} color="primary" />
        <StatCard label="Critical Actions" value="12" icon={ShieldAlert} color="error" />
        <StatCard label="Failed Logins" value="45" icon={UserX} color="warning" />
        <StatCard label="Configuration Changes" value="8" icon={Settings2} color="accent" />
      </div>

      <Card>
        <CardHeader title="Action Logs" subtitle="Sorted by most recent" />
        <DataTable
          columns={[
            { key: 'timestamp', label: 'Time', render: (r) => <span className="text-xs text-ink-500">{new Date(r.timestamp).toLocaleString()}</span> },
            { key: 'action', label: 'Action Taken', render: (r) => <span className="font-medium text-ink-900">{r.action}</span> },
            { key: 'actorName', label: 'Actor Name' },
            { key: 'actorRole', label: 'Actor Role' },
            { key: 'targetResource', label: 'Target Resource' },
            { key: 'ipAddress', label: 'IP Address', render: (r) => <span className="text-xs font-mono">{r.ipAddress}</span> },
            { key: 'status', label: 'Status', render: (r) => (
              <Badge variant={r.status === 'success' ? 'success' : 'error'}>{r.status}</Badge>
            ) }
          ]}
          data={state.auditLogs}
        />
      </Card>
    </div>
  );
}

export function BranchTheming() {
  const { state, setFeedback, updateBranchTheme } = useLmsData();
  const [editingTheme, setEditingTheme] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Multi-Tenant Branch Theming" subtitle="Customize appearance and domains for specific institutional branches" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Themes" value={state.branchThemes.length} icon={Palette} color="primary" />
        <StatCard label="Custom Domains" value={state.branchThemes.filter(t => t.customDomain).length} icon={Search} color="accent" />
        <StatCard label="Default Branches" value={4 - state.branchThemes.length} icon={Database} color="warning" />
      </div>

      <Card>
        <CardHeader title="Branch Configurations" subtitle="Manage specific branch appearances" />
        <DataTable
          columns={[
            { key: 'branchId', label: 'Branch ID', render: (r) => <span className="font-medium">{r.branchId}</span> },
            { key: 'primaryColor', label: 'Primary Color', render: (r) => (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-ink-200" style={{ backgroundColor: r.primaryColor }} />
                <span>{r.primaryColor}</span>
              </div>
            ) },
            { key: 'customDomain', label: 'Custom Domain', render: (r) => r.customDomain || <span className="text-ink-400 italic">None</span> },
            { key: 'actions', label: 'Actions', render: (r) => (
              <button onClick={() => setEditingTheme(r.id)} className="text-primary-600 text-sm font-medium hover:underline">Edit Theme</button>
            ) },
          ]}
          data={state.branchThemes}
        />
      </Card>

      <Modal open={!!editingTheme} onClose={() => setEditingTheme(null)} title="Edit Branch Theme" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          updateBranchTheme(editingTheme!, {
            primaryColor: fd.get('primaryColor') as string,
            customDomain: fd.get('customDomain') as string
          });
          setEditingTheme(null);
          setFeedback({ kind: 'success', message: 'Branch theme updated.' });
        }}>
          <div>
            <label className="label">Primary Color</label>
            <div className="flex gap-2">
              <input name="primaryColor" type="color" className="h-10 w-10 p-1 rounded border border-ink-200" defaultValue={state.branchThemes.find(t => t.id === editingTheme)?.primaryColor} />
              <input type="text" className="input flex-1" defaultValue={state.branchThemes.find(t => t.id === editingTheme)?.primaryColor} readOnly />
            </div>
          </div>
          <div>
            <label className="label">Custom Domain (Optional)</label>
            <input name="customDomain" className="input" placeholder="e.g. branch.skilltoss.com" defaultValue={state.branchThemes.find(t => t.id === editingTheme)?.customDomain} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditingTheme(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function InterBranchTransfer() {
  const { setFeedback } = useLmsData();
  const [transfers, setTransfers] = useState([
    { id: '1', student: 'Aarav Sharma', from: 'Mumbai Campus', to: 'Delhi Campus', date: '2023-11-15', status: 'Pending' },
    { id: '2', student: 'Priya Patel', from: 'Bangalore Campus', to: 'Hyderabad Campus', date: '2023-10-22', status: 'Approved' },
  ]);

  const handleApprove = (id: string) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'Approved' } : t));
    setFeedback({ kind: 'success', message: 'Transfer request approved.' });
  };

  return (
    <div>
      <PageHeader title="Inter-Branch Transfers" subtitle="Manage and track students transferring between campuses" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Transfers" value="1" icon={Users} color="warning" />
        <StatCard label="Completed (YTD)" value="45" icon={Check} color="success" />
        <StatCard label="Avg Transfer Time" value="3 days" icon={TrendingUp} color="primary" />
        <StatCard label="Rejected" value="2" icon={XCircle} color="error" />
      </div>
      <Card>
        <CardHeader title="Recent Transfer Requests" />
        <DataTable
          columns={[
            { key: 'student', label: 'Student Name', render: (r) => <span className="font-medium">{r.student}</span> },
            { key: 'from', label: 'From Campus' },
            { key: 'to', label: 'To Campus' },
            { key: 'date', label: 'Requested Date' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status as string} /> },
            { key: 'actions', label: 'Actions', render: (r) => r.status === 'Pending' ? (
              <Button size="sm" onClick={() => handleApprove(r.id)}>Approve</Button>
            ) : null }
          ]}
          data={transfers}
        />
      </Card>
    </div>
  );
}

export function ExecutiveDecisionCenter() {
  const { state, setFeedback, resolveExecutiveDecision } = useLmsData();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const openDecisions = state.executiveDecisions.filter(d => d.status === 'open');

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
          {openDecisions.length === 0 && <p className="text-ink-500 text-sm">No pending recommendations.</p>}
          {openDecisions.map(rec => (
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
                  <Button size="sm" onClick={() => setResolvingId(rec.id)}>Apply Strategy</Button>
                  <Button variant="ghost" size="sm" onClick={() => resolveExecutiveDecision(rec.id, 'Dismissed without action')}>Dismiss</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!resolvingId} onClose={() => setResolvingId(null)} title="Apply Strategy" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          resolveExecutiveDecision(resolvingId!, fd.get('strategy') as string);
          setResolvingId(null);
        }}>
          <div>
            <label className="label">Strategy Notes</label>
            <textarea name="strategy" required className="input" rows={4} placeholder="Describe the action you are taking..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setResolvingId(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Resolve & Apply</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function GlobalCampaignManager() {
  const { state, setFeedback, addGlobalCampaign, updateGlobalCampaign } = useLmsData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);

  return (
    <div>
      <PageHeader 
        title="Global Announcement Campaign Manager" 
        subtitle="Schedule campaigns and analyze engagement across all institutions" 
        actions={<Button icon={Plus} onClick={() => setIsAdding(true)}>Create Campaign</Button>}
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
            { key: 'actions', label: '', render: (r) => (
              <button onClick={() => setEditingCampaign(r.id)} className="text-primary-600 text-sm font-medium hover:underline">Edit</button>
            ) },
          ]}
          data={state.globalCampaigns}
        />
      </Card>

      <Modal open={isAdding} onClose={() => setIsAdding(false)} title="Create Global Campaign" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const newCampaign = {
            name: fd.get('name') as string,
            audience: fd.get('audience') as string,
            status: 'scheduled' as const,
            sent: 0,
            openRate: 0
          };
          addGlobalCampaign(newCampaign);
          setIsAdding(false);
          setFeedback({ kind: 'success', message: 'New global campaign drafted and scheduled.' });
        }}>
          <div>
            <label className="label">Campaign Name</label>
            <input name="name" required className="input" placeholder="e.g. End of Year Sale" />
          </div>
          <div>
            <label className="label">Target Audience</label>
            <select name="audience" className="input">
              <option>All Students</option>
              <option>Parents (Defaulters)</option>
              <option>All Teachers</option>
              <option>All Leads</option>
            </select>
          </div>
          <div>
            <label className="label">Message Content</label>
            <textarea name="message" className="input" rows={4} placeholder="Draft your announcement here..."></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Schedule Campaign</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingCampaign} onClose={() => setEditingCampaign(null)} title="Edit Campaign Status" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          updateGlobalCampaign(editingCampaign!, {
            status: fd.get('status') as 'scheduled' | 'active' | 'completed' | 'dismissed',
            dismissReason: fd.get('dismissReason') as string | undefined
          });
          setEditingCampaign(null);
        }}>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue={state.globalCampaigns.find(c => c.id === editingCampaign)?.status}>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="label">Reason (if dismissed)</label>
            <input name="dismissReason" type="text" className="input" defaultValue={state.globalCampaigns.find(c => c.id === editingCampaign)?.dismissReason} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditingCampaign(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>
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
