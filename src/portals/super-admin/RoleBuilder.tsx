import { useState } from 'react';
import { PageHeader, Card, CardHeader } from '@/components/ui/Layout';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useLmsData } from '@/lib/lmsDataContext';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';

export function RoleBuilder() {
  const { state, createRoleFromRequest, rejectRoleRequest } = useLmsData();

  const requests = state.roleRequests;
  const roles = state.customRoles;

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const activeRolesCount = roles.filter(r => r.status === 'active').length;

  return (
    <div>
      <PageHeader title="Custom Role Requests (RBAC)" subtitle="Approve and manage institution requests for custom roles and permissions" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Pending Requests" value={pendingCount} icon={ShieldAlert} color="warning" />
        <StatCard label="Active Custom Roles" value={activeRolesCount} icon={ShieldCheck} color="success" />
        <StatCard label="Total Roles Created" value={roles.length} icon={Shield} color="primary" />
      </div>

      <Card className="mb-6">
        <CardHeader title="Institution Role Requests" subtitle="Review pending requests to create custom roles" />
        <DataTable
          columns={[
            { key: 'institutionName', label: 'Institution', render: (r) => <span className="font-medium">{r.institutionName}</span> },
            { key: 'requestedRole', label: 'Requested Role Title' },
            { key: 'requestedPermissions', label: 'Permissions', render: (r) => (
              <div className="flex gap-1 flex-wrap">
                {r.requestedPermissions.map((p: string) => <Badge key={p} variant="primary">{p.replace('_', ' ')}</Badge>)}
              </div>
            ) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status as string} /> },
            { key: 'actions', label: 'Actions', render: (r) => r.status === 'pending' ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => createRoleFromRequest(r.id)}>Approve</Button>
                <Button size="sm" variant="ghost" onClick={() => rejectRoleRequest(r.id)}>Reject</Button>
              </div>
            ) : null }
          ]}
          data={requests}
        />
      </Card>

      <Card>
        <CardHeader title="Active Custom Roles" subtitle="Roles currently active across institutions" />
        <DataTable
          columns={[
            { key: 'name', label: 'Role Name', render: (r) => <span className="font-medium text-ink-900">{r.name}</span> },
            { key: 'institutionId', label: 'Institution ID' },
            { key: 'permissions', label: 'Permissions', render: (r) => (
              <div className="flex gap-1 flex-wrap">
                {r.permissions.map((p: string) => <Badge key={p} variant="neutral">{p.replace('_', ' ')}</Badge>)}
              </div>
            ) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status as string} /> }
          ]}
          data={roles}
        />
      </Card>
    </div>
  );
}
