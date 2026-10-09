const BASE_URL = import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:5556";

//**************** * AUTH ENDPOINTS ***************
export const authEndpoints = {
  SIGNUP_API: BASE_URL + "/v1/auth/signup",
  LOGIN_API: BASE_URL + "/v1/auth/login",
  REFRESH_TOKEN: BASE_URL + "/v1/auth/refresh-token/",
  RESEND_OTP_API: BASE_URL + "/v1/auth/resend-otp",
  FORGET_PASSWORD_API: BASE_URL + "/v1/auth/forget-password",
  UPDATE_PASSWORD: BASE_URL + "/v1/auth/update-password",
  UPDATE_ADMIN_DETAILS_API: BASE_URL + "/v1/auth/update-admin-details",
  CHANGE_EMAIL_INITIATE: BASE_URL + "/v1/auth/change-email-initiate",
  VERIFY_EMAIL: BASE_URL + "/v1/auth/verify-email",
  ME_API: BASE_URL + "/v1/auth/me",
};

//**************** * RBAC ENDPOINTS ***************

// Role management (superadmin only)
export const rolesEndpoints = {
  ROLES_API: BASE_URL + "/v1/roles",
  ROLE_HISTORY_API: BASE_URL + "/v1/roles/history",
};

// Admin user management (superadmin only)
export const adminUsersEndpoints = {
  USERS_API: BASE_URL + "/v1/admin/users",
  USER_HISTORY_API: BASE_URL + "/v1/admin/users/history",
  DELETED_USERS_API: BASE_URL + "/v1/admin/users/deleted",
};

// Activity trail — read-only; gated on the "activity-logs" drawer
export const activityLogsEndpoints = {
  ACTIVITY_LOGS_API: BASE_URL + "/v1/dashboard/activity-logs",
  ACTIVITY_LOG_FILTERS_API: BASE_URL + "/v1/dashboard/activity-logs/filters",
  ACTIVITY_LOG_EXPORT_API: BASE_URL + "/v1/dashboard/activity-logs/export",
};

// Approval requests for guarded fields (payment status): any admin raises one,
// only the superadmin reviews
export const approvalRequestsEndpoints = {
  REQUESTS_API: BASE_URL + "/v1/approval-requests",
  PENDING_API: BASE_URL + "/v1/approval-requests/pending",
  RECORD_API: BASE_URL + "/v1/approval-requests/record",
  ADMIN_API: BASE_URL + "/v1/approval-requests/admin",
  ADMIN_COUNTS_API: BASE_URL + "/v1/approval-requests/admin/counts",
  ADMIN_BULK_API: BASE_URL + "/v1/approval-requests/admin/bulk",
};

// Drawer permissions: self-service requests + superadmin grant/revoke
export const permissionsEndpoints = {
  CATALOG_API: BASE_URL + "/v1/permissions/catalog",
  REQUESTS_API: BASE_URL + "/v1/permissions/requests",
  MY_REQUESTS_API: BASE_URL + "/v1/permissions/requests/me",
  MY_HISTORY_API: BASE_URL + "/v1/permissions/history/me",
  ADMIN_REQUESTS_API: BASE_URL + "/v1/permissions/admin/requests",
  ADMIN_USERS_API: BASE_URL + "/v1/permissions/admin/users",
  GRANT_ACCESS_API: BASE_URL + "/v1/permissions/admin/grant",
  REVOKE_ACCESS_API: BASE_URL + "/v1/permissions/admin/revoke",
};

//**************** * ENQUIRY ENDPOINTS ***************
export const enquiryEndpoints = {
  GET_ALL_ENQUIRY_USER_API:
    BASE_URL + "/v1/dashboard/enquiry/get_all_enquiry_data",
  GET_ALL_PATIENTS_ENQUIRIES_API:
    BASE_URL + "/v1/dashboard/patients_enquiry/get_all_patients_enquiries",
  GET_ALL_PATIENTS_ENQUIRY_API:
    BASE_URL + "/v1/dashboard/patients_enquiry/get_all_patients_enquiry_data",
  ADD_PATIENTS_ENQUIRY_API:
    BASE_URL + "/v1/dashboard/patients_enquiry/add_patients_enquiry",
};

//**************** * DASHBOARD ENDPOINTS ***************
export const dashboardEndpoints = {
  GET_ALL_DASHBOARD_DATA_API:
    BASE_URL + "/v1/dashboard/get_dashboard_statistics",
};

//**************** * DASHBOARD ROUTES (Authentication Required) ***************

// Dashboard Blogs Endpoints
export const dashboardBlogEndpoints = {
  GET_ALL_BLOG_DATA_API: BASE_URL + "/v1/dashboard/blogs/get-all-blogs-data",
  ADD_BLOG_API: BASE_URL + "/v1/dashboard/blogs/add-blog",
  GET_BLOG_DETAILS_API: BASE_URL + "/v1/dashboard/blogs/get-blog-details",
  GET_BLOG_DETAILS_BY_URL_API:
    BASE_URL + "/v1/dashboard/blogs/get-blog-details-by-url",
  UPDATE_BLOG_API: BASE_URL + "/v1/dashboard/blogs/update-blog",
  DELETE_BLOG_API: BASE_URL + "/v1/dashboard/blogs/delete-blog",
};

// Dashboard News Endpoints
export const dashboardNewsEndpoints = {
  GET_ALL_NEWS_DATA_API: BASE_URL + "/v1/dashboard/news/get_all_news",
  ADD_NEWS_API: BASE_URL + "/v1/dashboard/news/add_news",
  GET_NEWS_BY_ID_API: BASE_URL + "/v1/dashboard/news/get_news_by_id",
  UPDATE_NEWS_API: BASE_URL + "/v1/dashboard/news/update_news",
  DELETE_NEWS_API: BASE_URL + "/v1/dashboard/news/delete_news",
  GET_FEATURED_NEWS_API: BASE_URL + "/v1/dashboard/news/get_featured_news",
  GET_NEWS_BY_CHANNEL_API: BASE_URL + "/v1/dashboard/news/get_news_by_channel",
  GET_NEWS_STATS_API: BASE_URL + "/v1/dashboard/news/get_news_stats",
};

// Dashboard Health Checkup Endpoints
export const dashboardHealthCheckupEndpoints = {
  GET_ALL_HEALTH_CHECKUPS_API:
    BASE_URL + "/v1/dashboard/health_checkup/get_all_health_checkups",
  ADD_HEALTH_CHECKUP_API:
    BASE_URL + "/v1/dashboard/health_checkup/add_health_checkup",
  GET_HEALTH_CHECKUP_BY_ID_API:
    BASE_URL + "/v1/dashboard/health_checkup/get_health_checkup_by_id",
  UPDATE_HEALTH_CHECKUP_API:
    BASE_URL + "/v1/dashboard/health_checkup/update_health_checkup",
  DELETE_HEALTH_CHECKUP_API:
    BASE_URL + "/v1/dashboard/health_checkup/delete_health_checkup",
  GET_FEATURED_HEALTH_CHECKUPS_API:
    BASE_URL + "/v1/dashboard/health_checkup/get_featured_health_checkups",
  GET_HEALTH_CHECKUP_STATS_API:
    BASE_URL + "/v1/dashboard/health_checkup/get_health_checkup_stats",
};

// Dashboard Doctors Endpoints
export const dashboardDoctorEndpoints = {
  GET_ALL_DOCTORS_DATA_API:
    BASE_URL + "/v1/dashboard/doctors/get_all_doctors_data",
  ADD_DOCTOR_DATA_API: BASE_URL + "/v1/dashboard/doctors/add_doctor_data",
  GET_DOCTOR_BY_ID_API: BASE_URL + "/v1/dashboard/doctors",
  UPDATE_DOCTOR_DATA_API: BASE_URL + "/v1/dashboard/doctors/update_doctor_data",
  DELETE_DOCTOR_DATA_API: BASE_URL + "/v1/dashboard/doctors/delete_doctor_data",
  UPDATE_DOCTOR_AVAILABILITY_API: BASE_URL + "/v1/dashboard/doctors",
  GET_DOCTORS_BY_DEPARTMENT_API: BASE_URL + "/v1/dashboard/doctors/department",
  GET_DOCTORS_STATS_API: BASE_URL + "/v1/dashboard/doctors/stats/overview",
};

// Dashboard International Patient APIs (Always Authenticated)
export const INTERNATIONAL_PATIENT_API = {
  GET_ALL_INTERNATIONAL_PATIENTS:
    BASE_URL +
    "/v1/dashboard/international_patient/get_international_patients",
  ADD_INTERNATIONAL_PATIENT:
    BASE_URL + "/v1/international-patients/add_international_patient",
  GET_INTERNATIONAL_PATIENT_BY_ID:
    BASE_URL +
    "/v1/dashboard/international_patient/get_international_patient_by_id",
  UPDATE_INTERNATIONAL_PATIENT:
    BASE_URL +
    "/v1/dashboard/international_patient/update_international_patient",
  DELETE_INTERNATIONAL_PATIENT:
    BASE_URL +
    "/v1/dashboard/international_patient/delete_international_patient",
  GET_INTERNATIONAL_PATIENT_STATS:
    BASE_URL +
    "/v1/dashboard/international_patient/get_international_patient_stats",
  GET_PATIENTS_BY_SPECIALITY:
    BASE_URL + "/v1/dashboard/international_patient/get_patients_by_speciality",
};

// Dashboard Patients Enquiry APIs (Always Authenticated)
export const PATIENTS_ENQUIRY_API = {
  GET_ALL_PATIENTS_ENQUIRY_API:
    BASE_URL + "/v1/dashboard/patients_enquiry/get_all_patients_enquiry_data",
  GET_ALL_PATIENTS_ENQUIRIES_API:
    BASE_URL + "/v1/dashboard/patients_enquiry/get_all_patients_enquiries",
  ADD_PATIENTS_ENQUIRY_API:
    BASE_URL + "/v1/dashboard/patients_enquiry/add_patients_enquiry",
  GET_PATIENTS_ENQUIRY_STATS:
    BASE_URL + "/v1/dashboard/patients_enquiry/get_patients_enquiry_stats",
};

// Dashboard Appointments APIs (Always Authenticated)
export const APPOINTMENTS_API = {
  GET_ALL_APPOINTMENTS: BASE_URL + "/v1/dashboard/appointments",
  GET_ALL_APPOINTMENTS_WITHOUT_PAGINATION: BASE_URL + "/v1/dashboard/all-appointments",
  ADD_APPOINTMENT: BASE_URL + "/v1/dashboard/appointments/add",
  GET_APPOINTMENT_BY_ID: BASE_URL + "/v1/dashboard/appointments",
  UPDATE_APPOINTMENT: BASE_URL + "/v1/dashboard/appointments",
  DELETE_APPOINTMENT: BASE_URL + "/v1/dashboard/appointments",
  AVAILABLE_SLOTS_API: BASE_URL + "/v1/public/appointments/available-slots",
};

// Dashboard Health Checkup Booking APIs (Always Authenticated)
// Package bookings are a separate resource from doctor appointments.
export const HEALTH_CHECKUP_BOOKINGS_API = {
  GET_ALL: BASE_URL + "/v1/dashboard/health-checkup-bookings",
  GET_BY_ID: BASE_URL + "/v1/dashboard/health-checkup-bookings",
  UPDATE: BASE_URL + "/v1/dashboard/health-checkup-bookings",
  RESCHEDULE: BASE_URL + "/v1/dashboard/health-checkup-bookings",
  DELETE: BASE_URL + "/v1/dashboard/health-checkup-bookings",
};

export const TEST_BOOKINGS_API = {
  GET_ALL: BASE_URL + "/v1/dashboard/test-bookings",
  GET_BY_ID: BASE_URL + "/v1/dashboard/test-bookings",
  UPDATE: BASE_URL + "/v1/dashboard/test-bookings",
  RESCHEDULE: BASE_URL + "/v1/dashboard/test-bookings",
  DELETE: BASE_URL + "/v1/dashboard/test-bookings",
};

// Dashboard Patients APIs (Always Authenticated)
export const PATIENTS_API = {
  GET_ALL_PATIENTS: BASE_URL + "/v1/dashboard/get_all_patients",
  ADD_PATIENT: BASE_URL + "/v1/dashboard/patients/add_patients_data",
  GET_PATIENT_DATA_BY_ID: BASE_URL + "/v1/dashboard/get_patients_data_by_id",
  UPDATE_PATIENT: BASE_URL + "/v1/dashboard/update_patients_data",
  DELETE_PATIENT: BASE_URL + "/v1/dashboard/delete_patients_data",
  UPLOAD_LAB_REPORT: BASE_URL + "/v1/dashboard/patients/upload_lab_report",
  GET_LAB_REPORTS: BASE_URL + "/v1/dashboard/patients/get_lab_reports",
  DELETE_LAB_REPORT: BASE_URL + "/v1/dashboard/patients/delete_lab_report",
  UPLOAD_PRESCRIPTION: BASE_URL + "/v1/dashboard/patients/upload_prescription",
  GET_PRESCRIPTIONS: BASE_URL + "/v1/dashboard/patients/get_prescriptions",
  DELETE_PRESCRIPTION: BASE_URL + "/v1/dashboard/patients/delete_prescription",
  GET_PATIENT_DOCUMENTS:
    BASE_URL + "/v1/dashboard/patients/get_patient_documents",
  GET_PATIENT_APPOINTMENTS: BASE_URL + "/v1/dashboard/appointments",
};

// Dashboard Departments APIs (Always Authenticated)
export const dashboardDepartmentEndpoints = {
  GET_ALL_DEPARTMENTS_API:
    BASE_URL + "/v1/dashboard/departments/get-all-departments",
  ADD_DEPARTMENT_API: BASE_URL + "/v1/dashboard/departments/add-department",
  GET_DEPARTMENT_BY_ID_API:
    BASE_URL + "/v1/dashboard/departments/get-department",
  UPDATE_DEPARTMENT_API:
    BASE_URL + "/v1/dashboard/departments/update-department",
  DELETE_DEPARTMENT_API:
    BASE_URL + "/v1/dashboard/departments/delete-department",
};

// Emergency SOS APIs (Always Authenticated)
export const EMERGENCY_SOS_API = {
  GET_ALL_SOS: BASE_URL + "/v1/dashboard/sos",
  RESOLVE_SOS: BASE_URL + "/v1/dashboard/sos",
};

// Ayushman Bharat APIs (Always Authenticated)
export const AYUSHMAN_BHARAT_API = {
  GET_ALL: BASE_URL + "/v1/dashboard/ayushman-bharat",
  GET_STATS: BASE_URL + "/v1/dashboard/ayushman-bharat/stats",
  GET_BY_ID: BASE_URL + "/v1/dashboard/ayushman-bharat",
  ADD: BASE_URL + "/v1/dashboard/ayushman-bharat",
  UPDATE: BASE_URL + "/v1/dashboard/ayushman-bharat",
  DELETE: BASE_URL + "/v1/dashboard/ayushman-bharat",
};
