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
import { Modal } from '@/components/ui/Modal';
import { useLmsData } from '@/lib/lmsDataContext';
import { Workflow, Link as LinkIcon, Webhook } from 'lucide-react';

export function WorkflowAutomation() {
  const { state, setFeedback, createWorkflow, updateWorkflow } = useLmsData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<string | null>(null);

  const activeCount = state.workflows.filter(w => w.status === 'active').length;

  return (
    <div>
      <PageHeader 
        title="Workflow Automation Builder" 
        subtitle="Create IFTTT rules for institutions to automate daily tasks" 
        actions={<Button icon={Plus} onClick={() => setIsAdding(true)}>New Rule</Button>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Workflows" value={state.workflows.length} icon={Workflow} color="primary" />
        <StatCard label="Active Rules" value={activeCount} icon={CheckCircle} color="success" />
        <StatCard label="Automations Triggered (24h)" value="142" icon={Activity} color="accent" />
      </div>

      <Card>
        <CardHeader title="Automation Rules" />
        <DataTable
          columns={[
            { key: 'name', label: 'Rule Name', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'trigger', label: 'Trigger' },
            { key: 'condition', label: 'Condition' },
            { key: 'action', label: 'Action' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status as string} /> },
            { key: 'actions', label: '', render: (r) => (
              <button onClick={() => setEditingWorkflow(r.id)} className="text-primary-600 text-sm font-medium hover:underline">Edit</button>
            ) },
          ]}
          data={state.workflows}
        />
      </Card>

      <Modal open={isAdding} onClose={() => setIsAdding(false)} title="New Automation Rule" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          createWorkflow({
            name: fd.get('name') as string,
            trigger: fd.get('trigger') as string,
            condition: fd.get('condition') as string,
            action: fd.get('action') as string,
            status: 'active'
          });
          setIsAdding(false);
          setFeedback({ kind: 'success', message: 'Automation rule created.' });
        }}>
          <div>
            <label className="label">Rule Name</label>
            <input name="name" required className="input" placeholder="e.g. Low Attendance Alert" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Trigger</label>
              <select name="trigger" className="input">
                <option value="attendance_below">Attendance Below</option>
                <option value="fee_overdue">Fee Overdue</option>
                <option value="grade_below">Grade Below</option>
              </select>
            </div>
            <div>
              <label className="label">Condition</label>
              <input name="condition" required className="input" placeholder="e.g. 75%" />
            </div>
          </div>
          <div>
            <label className="label">Action</label>
            <select name="action" className="input">
              <option value="send_email_parent">Send Email to Parent</option>
              <option value="alert_teacher">Alert Teacher</option>
              <option value="block_portal">Block Portal Access</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create Rule</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingWorkflow} onClose={() => setEditingWorkflow(null)} title="Edit Rule Status" size="sm">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          updateWorkflow(editingWorkflow!, {
            status: fd.get('status') as 'active' | 'paused'
          });
          setEditingWorkflow(null);
          setFeedback({ kind: 'success', message: 'Rule status updated.' });
        }}>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue={state.workflows.find(w => w.id === editingWorkflow)?.status}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditingWorkflow(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function IntegrationHub() {
  const { state, setFeedback, updateIntegration } = useLmsData();

  return (
    <div>
      <PageHeader 
        title="LTI & Integration Hub" 
        subtitle="Manage API keys, Webhooks, and third-party LTI integrations" 
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Integrations" value={state.integrations.filter(i => i.status === 'connected').length} icon={LinkIcon} color="primary" />
        <StatCard label="API Requests (24h)" value="12.4k" icon={Activity} color="success" />
        <StatCard label="Active Webhooks" value="2" icon={Webhook} color="accent" />
      </div>

      <Card>
        <CardHeader title="Configured Integrations" subtitle="Third-party tools connected to the LMS" />
        <DataTable
          columns={[
            { key: 'provider', label: 'Provider Name', render: (r) => <span className="font-medium text-ink-900">{r.provider}</span> },
            { key: 'category', label: 'Category' },
            { key: 'status', label: 'Connection Status', render: (r) => (
              <Badge variant={r.status === 'connected' ? 'success' : 'error'}>{r.status}</Badge>
            ) },
            { key: 'actions', label: 'Actions', render: (r) => (
              <Button size="sm" variant="ghost" onClick={() => {
                updateIntegration(r.id, { status: r.status === 'connected' ? 'disconnected' : 'connected' });
                setFeedback({ kind: 'info', message: `Integration ${r.status === 'connected' ? 'disconnected' : 'connected'}.` });
              }}>
                {r.status === 'connected' ? 'Disconnect' : 'Connect'}
              </Button>
            ) },
          ]}
          data={state.integrations}
        />
      </Card>
    </div>
  );
}

export function AiFeatureLab() {
  const { state, setFeedback, addBetaProgram, updateBetaProgram } = useLmsData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);

  return (
    <div>
      <PageHeader 
        title="AI Feature Experimentation Lab" 
        subtitle="Manage beta programs, pilot institutions, and collect AI feedback" 
        actions={
          <Button icon={Plus} onClick={() => setIsAdding(true)}>New Beta Program</Button>
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
            { key: 'actions', label: '', render: (r) => (
              <button onClick={() => setEditingProgram(r.id)} className="text-primary-600 text-sm font-medium hover:underline">Edit</button>
            ) },
          ]}
          data={state.betaPrograms}
        />
      </Card>
      
      <Modal open={isAdding} onClose={() => setIsAdding(false)} title="New Beta Program" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const newProgram = {
            name: fd.get('name') as string,
            type: 'Feature',
            pilotInstitutions: 0,
            feedbackScore: 0,
            status: 'planning' as const
          };
          addBetaProgram(newProgram);
          setIsAdding(false);
          setFeedback({ kind: 'success', message: 'New Beta Program created successfully!' });
        }}>
          <div>
            <label className="label">Program Name</label>
            <input name="name" required className="input" placeholder="e.g. AI Study Planner" />
          </div>
          <div>
            <label className="label">Category</label>
            <select name="type" className="input">
              <option>Assessment</option>
              <option>Analytics</option>
              <option>Learning</option>
              <option>Administration</option>
            </select>
          </div>
          <div>
            <label className="label">Target Pilot Institutions</label>
            <input name="pilotInstitutions" type="number" min="1" defaultValue="5" required className="input" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create Program</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingProgram} onClose={() => setEditingProgram(null)} title="Edit Beta Program" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          updateBetaProgram(editingProgram!, {
            status: fd.get('status') as 'active' | 'planning' | 'completed'
          });
          setEditingProgram(null);
        }}>
          <div>
            <label className="label">Program Status</label>
            <select name="status" className="input" defaultValue={state.betaPrograms.find(p => p.id === editingProgram)?.status}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditingProgram(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function SystemHealthMap() {
  const { setFeedback } = useLmsData();
  const [isChecking, setIsChecking] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [regions, setRegions] = useState([
    { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', status: 'Operational', latency: 45, uptime: 99.99 },
    { id: 'us-east-1', name: 'US East (N. Virginia)', status: 'Operational', latency: 120, uptime: 99.95 },
    { id: 'eu-west-1', name: 'Europe (Ireland)', status: 'Degraded', latency: 250, uptime: 98.40 },
  ]);

  const runDiagnostics = () => {
    setIsChecking(true);
    setDiagnosticLogs(['Initiating system diagnostic checks...']);
    
    setTimeout(() => {
      setDiagnosticLogs(prev => [...prev, 'Checking AP-South-1 (Mumbai): OK (45ms)']);
    }, 600);
    
    setTimeout(() => {
      setDiagnosticLogs(prev => [...prev, 'Checking US-East-1 (N. Virginia): OK (120ms)']);
    }, 1200);

    setTimeout(() => {
      setDiagnosticLogs(prev => [...prev, 'Checking EU-West-1 (Ireland): DEGRADED (250ms). Attempting to route traffic...']);
    }, 1800);

    setTimeout(() => {
      setRegions(regions.map(r => r.status === 'Degraded' ? { ...r, status: 'Operational', latency: 130 } : r));
      setDiagnosticLogs(prev => [...prev, 'Traffic rerouted. EU-West-1 is now Operational (130ms).', 'Diagnostics complete: All systems passed.']);
      setIsChecking(false);
      setFeedback({ kind: 'success', message: 'Diagnostics complete: All systems passed.' });
    }, 2800);
  };

  return (
    <div>
      <PageHeader 
        title="Global System Health" 
        subtitle="Real-time infrastructure monitoring, API limits, and region status" 
        actions={<Button variant="outline" icon={Activity} onClick={runDiagnostics}>{isChecking ? 'Checking...' : 'Run Diagnostics'}</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Global Uptime" value="99.98%" icon={CheckCircle} color="success" />
        <StatCard label="Active Regions" value="3/3" icon={Map} color="primary" />
        <StatCard label="Avg Latency" value="138ms" icon={Activity} color="warning" />
        <StatCard label="API Requests/min" value="14.2k" icon={Layout} color="accent" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Regional Status" subtitle="Current server health by location" />
          <DataTable
            columns={[
              { key: 'name', label: 'Region' },
              { key: 'latency', label: 'Latency (ms)', render: (r) => `${r.latency}ms` },
              { key: 'uptime', label: 'Uptime (30d)', render: (r) => `${r.uptime}%` },
              { key: 'status', label: 'Status', render: (r) => (
                <Badge variant={r.status === 'Operational' ? 'success' : 'error'}>{r.status as 'success' | 'error'}</Badge>
              ) },
            ]}
            data={regions}
          />
        </Card>
        <Card>
          <CardHeader title="Diagnostic Logs" subtitle="Live output of health checks" />
          <div className="p-4 h-64 bg-ink-950 rounded-b-xl overflow-y-auto font-mono text-xs text-ink-300 space-y-2">
            {diagnosticLogs.length === 0 && <p className="text-ink-600">Run diagnostics to view system logs...</p>}
            {diagnosticLogs.map((log, i) => (
              <div key={i} className={log.includes('DEGRADED') ? 'text-error-400' : log.includes('passed') ? 'text-success-400' : ''}>
                &gt; {log}
              </div>
            ))}
            {isChecking && <div className="animate-pulse">&gt; _</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function SlaDashboard() {
  const { setFeedback } = useLmsData();
  const [escalations, setEscalations] = useState([
    { id: 'ESC-01', client: 'Acme School', issue: 'Portal Down', slaTimeLeft: 'Expired', status: 'Critical', assignedTo: 'L3 Support' },
    { id: 'ESC-02', client: 'Global Tech', issue: 'Billing Error', slaTimeLeft: '2h 15m', status: 'Warning', assignedTo: 'Finance' },
    { id: 'ESC-03', client: 'Sunrise High', issue: 'Missing Grades', slaTimeLeft: '14h 30m', status: 'Normal', assignedTo: 'L1 Support' },
  ]);

  const handleExport = () => {
    const header = 'ID,Client,Issue,SLA Time Left,Status,Assigned To\n';
    const rows = escalations.map(e => `${e.id},${e.client},${e.issue},${e.slaTimeLeft},${e.status},${e.assignedTo}`).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sla-escalations-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ kind: 'success', message: 'SLA report exported.' });
  };

  return (
    <div>
      <PageHeader 
        title="SLA Monitoring Dashboard" 
        subtitle="Track response times, resolution tracking, and escalations" 
        actions={<Button variant="outline" icon={Download} onClick={handleExport}>Export Report</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active SLA Timers" value="24" icon={Clock} color="warning" />
        <StatCard label="Avg Response Time" value="14m" icon={Zap} color="success" />
        <StatCard label="Resolution Rate" value="94%" icon={CheckCircle} color="primary" />
        <StatCard label="Escalation Alerts" value={escalations.length} icon={ShieldAlert} color="error" />
      </div>
      <Card>
        <CardHeader title="Active Escalations" />
        <DataTable
          columns={[
            { key: 'id', label: 'Escalation ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
            { key: 'client', label: 'Client', render: (r) => <span className="font-medium text-ink-900">{r.client}</span> },
            { key: 'issue', label: 'Issue' },
            { key: 'assignedTo', label: 'Assigned To' },
            { key: 'slaTimeLeft', label: 'SLA Time Left', render: (r) => (
              <span className={r.slaTimeLeft === 'Expired' ? 'text-error-600 font-bold' : ''}>{r.slaTimeLeft}</span>
            ) },
            { key: 'status', label: 'Status', render: (r) => (
              <Badge variant={r.status === 'Critical' ? 'error' : r.status === 'Warning' ? 'warning' : 'success'}>{r.status}</Badge>
            ) },
          ]}
          data={escalations}
        />
      </Card>
    </div>
  );
}

export function RoadmapManager() {
  const { state, setFeedback, addRoadmapFeature, updateRoadmapFeature } = useLmsData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);

  return (
    <div>
      <PageHeader 
        title="Product Roadmap Manager" 
        subtitle="Manage feature releases, customer voting, and dev progress" 
        actions={<Button icon={Plus} onClick={() => setIsAdding(true)}>Add Feature</Button>}
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
            { key: 'actions', label: '', render: (r) => (
              <button onClick={() => setEditingFeature(r.id)} className="text-primary-600 text-sm font-medium hover:underline">Edit</button>
            ) },
          ]}
          data={state.roadmapFeatures}
        />
      </Card>

      <Modal open={isAdding} onClose={() => setIsAdding(false)} title="Add Roadmap Feature" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const newFeature = {
            feature: fd.get('feature') as string,
            priority: fd.get('priority') as string,
            status: 'Planned' as const,
            votes: 0,
            progress: 0
          };
          addRoadmapFeature(newFeature);
          setIsAdding(false);
          setFeedback({ kind: 'success', message: 'Feature added to Roadmap.' });
        }}>
          <div>
            <label className="label">Feature Name</label>
            <input name="feature" required className="input" placeholder="e.g. Payment Gateway V2" />
          </div>
          <div>
            <label className="label">Priority</label>
            <select name="priority" className="input">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div>
            <label className="label">Description (Optional)</label>
            <textarea name="description" className="input" rows={3} placeholder="Briefly describe the feature..."></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Add to Roadmap</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingFeature} onClose={() => setEditingFeature(null)} title="Edit Roadmap Feature" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          updateRoadmapFeature(editingFeature!, {
            status: fd.get('status') as 'Planned' | 'In Progress' | 'Completed',
            progress: Number(fd.get('progress'))
          });
          setEditingFeature(null);
        }}>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue={state.roadmapFeatures.find(f => f.id === editingFeature)?.status}>
              <option>Planned</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
          <div>
            <label className="label">Progress (%)</label>
            <input name="progress" type="number" min="0" max="100" required className="input" defaultValue={state.roadmapFeatures.find(f => f.id === editingFeature)?.progress} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditingFeature(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
