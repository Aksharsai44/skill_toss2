import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LandingPage } from '@/components/LandingPage';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StudentCourses } from '@/components/StudentCourses';
import type { Role } from '@/lib/types';
import type { ReactNode } from 'react';

import { ProductAdminDashboard, DemoRequests, Clients, PlansPricing, FeatureToggles, WhiteLabel } from '@/portals/product-admin';
import { SuperAdminDashboard, Branches, Revenue, LeadsReport, ConsolidatedReports } from '@/portals/super-admin';
import { AdminDashboard, AdminTeachers, AdminStudents, AdminBatches, AdminFees, AdminSalary, AdminAttendance, AdminLeaves, AdminEvents, AdminIntegrations, AdminCertifications, AdminCalendar, AdminCourses } from '@/portals/admin';
import { TeacherDashboard, TeacherBatches, LiveClasses, TeacherRecordings, TeacherAttendance, TeacherLeaves, TeacherCourses, TeacherAssignments, TeacherExams, TeacherResources, TeacherCommunity, TeacherForum, TeacherCalendar, TeacherSalary, TeacherProfile } from '@/portals/teacher';
import { StudentDashboard, StudentClasses, StudentRecordings, StudentResources, MyNotes, StudentAssignments, StudentExams, StudentTimetable, StudentDiary, StudentLeaves, StudentCommunity, StudentForum, StudentCalendar, StudentFees, StudentReports, StudentCertifications, AiHub, StudentProfile } from '@/portals/student';

function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role === 'product-admin' ? 'product-admin' : user.role}`} replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Product Admin */}
      <Route path="/product-admin" element={<ProtectedRoute role="product-admin"><ProductAdminDashboard /></ProtectedRoute>} />
      <Route path="/product-admin/demos" element={<ProtectedRoute role="product-admin"><DemoRequests /></ProtectedRoute>} />
      <Route path="/product-admin/clients" element={<ProtectedRoute role="product-admin"><Clients /></ProtectedRoute>} />
      <Route path="/product-admin/plans" element={<ProtectedRoute role="product-admin"><PlansPricing /></ProtectedRoute>} />
      <Route path="/product-admin/features" element={<ProtectedRoute role="product-admin"><FeatureToggles /></ProtectedRoute>} />
      <Route path="/product-admin/white-label" element={<ProtectedRoute role="product-admin"><WhiteLabel /></ProtectedRoute>} />

      {/* Super Admin */}
      <Route path="/super-admin" element={<ProtectedRoute role="super-admin"><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/super-admin/branches" element={<ProtectedRoute role="super-admin"><Branches /></ProtectedRoute>} />
      <Route path="/super-admin/revenue" element={<ProtectedRoute role="super-admin"><Revenue /></ProtectedRoute>} />
      <Route path="/super-admin/leads" element={<ProtectedRoute role="super-admin"><LeadsReport /></ProtectedRoute>} />
      <Route path="/super-admin/reports" element={<ProtectedRoute role="super-admin"><ConsolidatedReports /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute role="admin"><AdminTeachers /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute role="admin"><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/batches" element={<ProtectedRoute role="admin"><AdminBatches /></ProtectedRoute>} />
      <Route path="/admin/fees" element={<ProtectedRoute role="admin"><AdminFees /></ProtectedRoute>} />
      <Route path="/admin/salary" element={<ProtectedRoute role="admin"><AdminSalary /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/leaves" element={<ProtectedRoute role="admin"><AdminLeaves /></ProtectedRoute>} />
      <Route path="/admin/events" element={<ProtectedRoute role="admin"><AdminEvents /></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute role="admin"><AdminIntegrations /></ProtectedRoute>} />
      <Route path="/admin/courses" element={<ProtectedRoute role="admin"><AdminCourses /></ProtectedRoute>} />
      <Route path="/admin/certifications" element={<ProtectedRoute role="admin"><AdminCertifications /></ProtectedRoute>} />
      <Route path="/admin/calendar" element={<ProtectedRoute role="admin"><AdminCalendar /></ProtectedRoute>} />

      {/* Teacher */}
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/batches" element={<ProtectedRoute role="teacher"><TeacherBatches /></ProtectedRoute>} />
      <Route path="/teacher/classes" element={<ProtectedRoute role="teacher"><LiveClasses /></ProtectedRoute>} />
      <Route path="/teacher/recordings" element={<ProtectedRoute role="teacher"><TeacherRecordings /></ProtectedRoute>} />
      <Route path="/teacher/attendance" element={<ProtectedRoute role="teacher"><TeacherAttendance /></ProtectedRoute>} />
      <Route path="/teacher/leaves" element={<ProtectedRoute role="teacher"><TeacherLeaves /></ProtectedRoute>} />
      <Route path="/teacher/courses" element={<ProtectedRoute role="teacher"><TeacherCourses /></ProtectedRoute>} />
      <Route path="/teacher/assignments" element={<ProtectedRoute role="teacher"><TeacherAssignments /></ProtectedRoute>} />
      <Route path="/teacher/exams" element={<ProtectedRoute role="teacher"><TeacherExams /></ProtectedRoute>} />
      <Route path="/teacher/resources" element={<ProtectedRoute role="teacher"><TeacherResources /></ProtectedRoute>} />
      <Route path="/teacher/community" element={<ProtectedRoute role="teacher"><TeacherCommunity /></ProtectedRoute>} />
      <Route path="/teacher/forum" element={<ProtectedRoute role="teacher"><TeacherForum /></ProtectedRoute>} />
      <Route path="/teacher/calendar" element={<ProtectedRoute role="teacher"><TeacherCalendar /></ProtectedRoute>} />
      <Route path="/teacher/salary" element={<ProtectedRoute role="teacher"><TeacherSalary /></ProtectedRoute>} />
      <Route path="/teacher/profile" element={<ProtectedRoute role="teacher"><TeacherProfile /></ProtectedRoute>} />

      {/* Student */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/classes" element={<ProtectedRoute role="student"><StudentClasses /></ProtectedRoute>} />
      <Route path="/student/recordings" element={<ProtectedRoute role="student"><StudentRecordings /></ProtectedRoute>} />
      <Route path="/student/resources" element={<ProtectedRoute role="student"><StudentResources /></ProtectedRoute>} />
      <Route path="/student/my-notes" element={<ProtectedRoute role="student"><MyNotes /></ProtectedRoute>} />
      <Route path="/student/assignments" element={<ProtectedRoute role="student"><StudentAssignments /></ProtectedRoute>} />
      <Route path="/student/exams" element={<ProtectedRoute role="student"><StudentExams /></ProtectedRoute>} />
      <Route path="/student/timetable" element={<ProtectedRoute role="student"><StudentTimetable /></ProtectedRoute>} />
      <Route path="/student/diary" element={<ProtectedRoute role="student"><StudentDiary /></ProtectedRoute>} />
      <Route path="/student/leaves" element={<ProtectedRoute role="student"><StudentLeaves /></ProtectedRoute>} />
      <Route path="/student/courses" element={<ProtectedRoute role="student"><StudentCourses /></ProtectedRoute>} />
      <Route path="/student/community" element={<ProtectedRoute role="student"><StudentCommunity /></ProtectedRoute>} />
      <Route path="/student/forum" element={<ProtectedRoute role="student"><StudentForum /></ProtectedRoute>} />
      <Route path="/student/calendar" element={<ProtectedRoute role="student"><StudentCalendar /></ProtectedRoute>} />
      <Route path="/student/fees" element={<ProtectedRoute role="student"><StudentFees /></ProtectedRoute>} />
      <Route path="/student/reports" element={<ProtectedRoute role="student"><StudentReports /></ProtectedRoute>} />
      <Route path="/student/certifications" element={<ProtectedRoute role="student"><StudentCertifications /></ProtectedRoute>} />
      <Route path="/student/ai-hub" element={<ProtectedRoute role="student"><AiHub /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
