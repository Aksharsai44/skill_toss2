import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { LandingPage } from '@/components/LandingPage';
import { LoginPage } from '@/components/LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StudentCourses } from '@/components/StudentCourses';
import { StudentPortalProvider } from '@/lib/studentPortal';

import { ProductAdminDashboard, DemoRequests, Clients, PlansPricing, FeatureToggles, WhiteLabel, CustomerSupport } from '@/portals/product-admin';
import { SuperAdminDashboard, Branches, Revenue, LeadsReport, ConsolidatedReports, InstitutionManagement, AdminManagement, UserManagement } from '@/portals/super-admin';
import { AdminDashboard, AdminTeachers, AdminStudents, AdminBatches, AdminFees, AdminSalary, AdminAttendance, AdminLeaves, AdminEvents, AdminIntegrations, AdminCertifications, AdminCalendar, AdminCourses } from '@/portals/admin';
import { TeacherDashboard, TeacherBatches, LiveClasses, TeacherRecordings, TeacherAttendance, TeacherLeaves, TeacherCourses, TeacherAssignments, TeacherExams, TeacherResources, TeacherCommunity, TeacherForum, TeacherCalendar, TeacherSalary, TeacherProfile } from '@/portals/teacher';
import { StudentDashboard, StudentClasses, StudentRecordings, StudentResources, MyNotes, StudentAssignments, StudentExams, StudentTimetable, StudentDiary, StudentLeaves, StudentCommunity, StudentForum, StudentCalendar, StudentFees, StudentReports, StudentCertifications, AiHub, StudentProfile } from '@/portals/student';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Product Admin */}
      <Route path="/product-admin" element={<ProtectedRoute allowedRoles={['product_admin']}><ProductAdminDashboard /></ProtectedRoute>} />
      <Route path="/product-admin/demos" element={<ProtectedRoute allowedRoles={['product_admin']}><DemoRequests /></ProtectedRoute>} />
      <Route path="/product-admin/clients" element={<ProtectedRoute allowedRoles={['product_admin']}><Clients /></ProtectedRoute>} />
      <Route path="/product-admin/plans" element={<ProtectedRoute allowedRoles={['product_admin']}><PlansPricing /></ProtectedRoute>} />
      <Route path="/product-admin/features" element={<ProtectedRoute allowedRoles={['product_admin']}><FeatureToggles /></ProtectedRoute>} />
      <Route path="/product-admin/white-label" element={<ProtectedRoute allowedRoles={['product_admin']}><WhiteLabel /></ProtectedRoute>} />
      <Route path="/product-admin/support" element={<ProtectedRoute allowedRoles={['product_admin']}><CustomerSupport /></ProtectedRoute>} />

      {/* Super Admin */}
      <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/super-admin/branches" element={<ProtectedRoute allowedRoles={['super_admin']}><Branches /></ProtectedRoute>} />
      <Route path="/super-admin/revenue" element={<ProtectedRoute allowedRoles={['super_admin']}><Revenue /></ProtectedRoute>} />
      <Route path="/super-admin/leads" element={<ProtectedRoute allowedRoles={['super_admin']}><LeadsReport /></ProtectedRoute>} />
      <Route path="/super-admin/reports" element={<ProtectedRoute allowedRoles={['super_admin']}><ConsolidatedReports /></ProtectedRoute>} />
      <Route path="/super-admin/institutions" element={<ProtectedRoute allowedRoles={['super_admin']}><InstitutionManagement /></ProtectedRoute>} />
      <Route path="/super-admin/admins" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminManagement /></ProtectedRoute>} />
      <Route path="/super-admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><UserManagement /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeachers /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/batches" element={<ProtectedRoute allowedRoles={['admin']}><AdminBatches /></ProtectedRoute>} />
      <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['admin']}><AdminFees /></ProtectedRoute>} />
      <Route path="/admin/salary" element={<ProtectedRoute allowedRoles={['admin']}><AdminSalary /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/leaves" element={<ProtectedRoute allowedRoles={['admin']}><AdminLeaves /></ProtectedRoute>} />
      <Route path="/admin/events" element={<ProtectedRoute allowedRoles={['admin']}><AdminEvents /></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute allowedRoles={['admin']}><AdminIntegrations /></ProtectedRoute>} />
      <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['admin']}><AdminCourses /></ProtectedRoute>} />
      <Route path="/admin/certifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminCertifications /></ProtectedRoute>} />
      <Route path="/admin/calendar" element={<ProtectedRoute allowedRoles={['admin']}><AdminCalendar /></ProtectedRoute>} />

      {/* Teacher */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/batches" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherBatches /></ProtectedRoute>} />
      <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={['teacher']}><LiveClasses /></ProtectedRoute>} />
      <Route path="/teacher/recordings" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherRecordings /></ProtectedRoute>} />
      <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAttendance /></ProtectedRoute>} />
      <Route path="/teacher/leaves" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherLeaves /></ProtectedRoute>} />
      <Route path="/teacher/courses" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherCourses /></ProtectedRoute>} />
      <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAssignments /></ProtectedRoute>} />
      <Route path="/teacher/exams" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherExams /></ProtectedRoute>} />
      <Route path="/teacher/resources" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherResources /></ProtectedRoute>} />
      <Route path="/teacher/community" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherCommunity /></ProtectedRoute>} />
      <Route path="/teacher/forum" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherForum /></ProtectedRoute>} />
      <Route path="/teacher/calendar" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherCalendar /></ProtectedRoute>} />
      <Route path="/teacher/salary" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherSalary /></ProtectedRoute>} />
      <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherProfile /></ProtectedRoute>} />

      {/* Student & Parent */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/classes" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentClasses /></ProtectedRoute>} />
      <Route path="/student/recordings" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentRecordings /></ProtectedRoute>} />
      <Route path="/student/resources" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentResources /></ProtectedRoute>} />
      <Route path="/student/my-notes" element={<ProtectedRoute allowedRoles={['student']}><MyNotes /></ProtectedRoute>} />
      <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentAssignments /></ProtectedRoute>} />
      <Route path="/student/exams" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentExams /></ProtectedRoute>} />
      <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentTimetable /></ProtectedRoute>} />
      <Route path="/student/diary" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentDiary /></ProtectedRoute>} />
      <Route path="/student/leaves" element={<ProtectedRoute allowedRoles={['student']}><StudentLeaves /></ProtectedRoute>} />
      <Route path="/student/courses" element={<ProtectedRoute allowedRoles={['student']}><StudentCourses /></ProtectedRoute>} />
      <Route path="/student/community" element={<ProtectedRoute allowedRoles={['student']}><StudentCommunity /></ProtectedRoute>} />
      <Route path="/student/forum" element={<ProtectedRoute allowedRoles={['student']}><StudentForum /></ProtectedRoute>} />
      <Route path="/student/calendar" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentCalendar /></ProtectedRoute>} />
      <Route path="/student/fees" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentFees /></ProtectedRoute>} />
      <Route path="/student/reports" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentReports /></ProtectedRoute>} />
      <Route path="/student/certifications" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentCertifications /></ProtectedRoute>} />
      <Route path="/student/ai-hub" element={<ProtectedRoute allowedRoles={['student']}><AiHub /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student', 'parent']}><StudentProfile /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StudentPortalProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </StudentPortalProvider>
    </AuthProvider>
  );
}
