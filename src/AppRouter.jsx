import { Routes, Route } from "react-router-dom";
import HomePage from "@/pages/page";
import NotFound from "@/pages/not-found";
import DashboardLayout from "@/pages/dashboard/layout";
import Dashboard from "@/pages/dashboard/page";
import PatientEnquiryPage from "@/pages/dashboard/patients-enquiries/page";
import AppointmentsPage from "@/pages/dashboard/appointments/page";
import EmergencySosPage from "@/pages/dashboard/emergency-sos/page";
import InternationalPatientsPage from "@/pages/dashboard/international-patients/page";
import PatientPage from "@/pages/dashboard/patient/page";
import PatientDetailsPage from "@/pages/dashboard/patient/[id]/page";
import AyushmanBharatPage from "@/pages/dashboard/ayushman-bharat/page";
import DoctorsPage from "@/pages/dashboard/doctors/page";
import DoctorDetailsPage from "@/pages/dashboard/doctors/[id]/page";
import HealthCheckupPage from "@/pages/dashboard/health-checkup/page";
import CheckupBookingsPage from "@/pages/dashboard/checkup-bookings/page";
import TestsBookingsPage from "@/pages/dashboard/tests-bookings/page";
import HealthCheckupDetailsPage from "@/pages/dashboard/health-checkup/[id]/page";
import DepartmentsPage from "@/pages/dashboard/departments/page";
import DepartmentDetailsPage from "@/pages/dashboard/departments/[id]/page";
import BlogLayout from "@/pages/dashboard/blogs/layout";
import BlogDashboard from "@/pages/dashboard/blogs/page";
import AllBlogs from "@/pages/dashboard/blogs/all-blogs/page";
import CreateBlog from "@/pages/dashboard/blogs/create-blog/page";
import EditBlogPost from "@/pages/dashboard/blogs/edit/[_id]/page";
import NewsLayout from "@/pages/dashboard/news/layout";
import NewsDashboard from "@/pages/dashboard/news/page";
import AllNews from "@/pages/dashboard/news/all-news/page";
import CreateNews from "@/pages/dashboard/news/create-news/page";
import EditNews from "@/pages/dashboard/news/edit/[id]/page";
import SettingsPage from "@/pages/dashboard/settings/page";
import RoleManagementPage from "@/pages/dashboard/role-management/page";
import UserManagementPage from "@/pages/dashboard/user-management/page";
import PermissionRequestsPage from "@/pages/dashboard/permission-requests/page";
import RequestAccessPage from "@/pages/dashboard/request-access/page";
import ActivityLogsPage from "@/pages/dashboard/activity-logs/page";
import ApprovalRequestsPage from "@/pages/dashboard/approval-requests/page";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />

        <Route path="patients-enquiries" element={<PatientEnquiryPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="emergency-sos" element={<EmergencySosPage />} />
        <Route
          path="international-patients"
          element={<InternationalPatientsPage />}
        />

        <Route path="patient" element={<PatientPage />} />
        <Route path="patient/:id" element={<PatientDetailsPage />} />
        <Route path="ayushman-bharat" element={<AyushmanBharatPage />} />

        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="doctors/:id" element={<DoctorDetailsPage />} />

        <Route path="checkup-bookings" element={<CheckupBookingsPage />} />
        <Route path="tests-bookings" element={<TestsBookingsPage />} />
        <Route path="health-checkup" element={<HealthCheckupPage />} />
        <Route path="health-checkup/:id" element={<HealthCheckupDetailsPage />} />

        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="departments/:id" element={<DepartmentDetailsPage />} />

        <Route path="blogs" element={<BlogLayout />}>
          <Route index element={<BlogDashboard />} />
          <Route path="all-blogs" element={<AllBlogs />} />
          <Route path="create-blog" element={<CreateBlog />} />
          <Route path="edit/:_id" element={<EditBlogPost />} />
        </Route>

        <Route path="news" element={<NewsLayout />}>
          <Route index element={<NewsDashboard />} />
          <Route path="all-news" element={<AllNews />} />
          <Route path="create-news" element={<CreateNews />} />
          <Route path="edit/:id" element={<EditNews />} />
        </Route>

        <Route path="settings" element={<SettingsPage />} />

        <Route path="role-management" element={<RoleManagementPage />} />
        <Route path="user-management" element={<UserManagementPage />} />

        <Route
          path="permission-requests"
          element={<PermissionRequestsPage />}
        />
        <Route path="request-access" element={<RequestAccessPage />} />
        <Route path="approval-requests" element={<ApprovalRequestsPage />} />

        <Route path="activity-logs" element={<ActivityLogsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
