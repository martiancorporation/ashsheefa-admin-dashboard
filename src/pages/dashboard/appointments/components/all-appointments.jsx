import { useState, useEffect } from "react";
import {
  Ellipsis,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  Receipt,
  Phone,
  MapPin,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  X,
  Ban,
  ClipboardList,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppointmentDetailsModal } from "./appointment-details-modal";
import { AddAppointmentModal } from "./add-appointment-modal";
import { EditAppointmentModal } from "./edit-appointment-modal";
import { DeleteConfirmationModal } from "./delete-confirmation-modal";
import { UpdateStatusModal } from "./update-status-modal";
import { CancelAppointmentModal } from "./cancel-appointment-modal";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import appointments from "@/api/appointments";
import {
  isWithinInterval,
  isSameDay,
  parseISO,
  startOfDay,
  endOfDay,
} from "date-fns";
import TablePagination from "@/pages/components/common/Pagination";
import { dedupeDoctorTitle } from "@/lib/formatText";
import { RequestChangeModal } from "@/pages/dashboard/approval-requests/components/request-change-modal";
import { RequestStatusModal } from "@/pages/dashboard/approval-requests/components/request-status-modal";
import {
  PendingApprovalPill,
  useNeedsApproval,
  usePendingApprovals,
} from "@/pages/dashboard/approval-requests/components/approval-helpers";

export default function AllAppointments({
  searchQuery = "",
  selectedStatus = "",
  selectedSpeciality = "",
  dateRange = null,
  onAppointmentUpdate,
  departments = [],
  departmentsLoading = false,
  onVisibleAppointmentsChange,
}) {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [statusUpdateModalOpen, setStatusUpdateModalOpen] = useState(false);
  const [statusUpdateAppointment, setStatusUpdateAppointment] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelAppointment, setCancelAppointment] = useState(null);
  const [sortOrder, setSortOrder] = useState(null); // null, 'asc', or 'desc'
  const [approvalAppointment, setApprovalAppointment] = useState(null);
  const [requestStatusOpen, setRequestStatusOpen] = useState(false);
  const [requestChangeOpen, setRequestChangeOpen] = useState(false);
  const [proposedChange, setProposedChange] = useState(null);

  // Payment status is superadmin-only; others raise an approval request.
  const needsApproval = useNeedsApproval();

  // `?approval=<record id>` comes from the "request approved/rejected" email:
  // open that record's request status straight away.
  const [searchParams, setSearchParams] = useSearchParams();
  const approvalLink = searchParams.get("approval");
  useEffect(() => {
    if (!approvalLink) return;
    setApprovalAppointment((current) => (current?._id === approvalLink ? current : { _id: approvalLink }));
    setRequestStatusOpen(true);
  }, [approvalLink]);

  const handleRequestStatusOpenChange = (open) => {
    setRequestStatusOpen(open);
    if (!open && approvalLink) {
      const next = new URLSearchParams(searchParams);
      next.delete("approval");
      setSearchParams(next, { replace: true });
    }
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch appointments from API
  const fetchAppointments = async () => {
    try {
      // Convert filter values back to original format for API
      const statusParam =
        selectedStatus && selectedStatus !== "all-status"
          ? selectedStatus.replace(/-/g, " ")
          : "";
      const specialityParam =
        selectedSpeciality && selectedSpeciality !== "all-specialities"
          ? selectedSpeciality.replace(/-/g, " ")
          : "";

      const params = {
        search: searchQuery,
        status: statusParam,
        speciality: specialityParam,
      };

      const response =
        await appointments.getAllAppointmentsWithoutPagination(params);

      if (response.success === true) {
        setAppointmentsList(response.data);
      } else {
        setError("Failed to fetch appointments data");
        toast.error("Failed to fetch appointments data");
      }
    } catch (error) {
      toast.error("Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when filters change
  // Note: searchQuery is handled client-side only, so it's not in the dependency array
  useEffect(() => {
    setCurrentPage(1);
    fetchAppointments();
  }, [selectedStatus, selectedSpeciality, dateRange]);

  // Handle appointment refresh after add/edit/delete
  const handleAppointmentUpdate = () => {
    refreshApprovals();
    if (onAppointmentUpdate) {
      onAppointmentUpdate();
    } else {
      setCurrentPage(1);
      fetchAppointments();
    }
  };

  const openRequestStatus = (appointment) => {
    setApprovalAppointment(appointment);
    setOpenDropdownId(null);
    setRequestStatusOpen(true);
  };

  const handlePaymentStatusChange = (appointment, value) => {
    if (value === (appointment.paymentStatus || "pending")) return;
    // Marking paid collects the mode/reference first, request or not.
    if (value === "paid") {
      handleUpdateStatus(appointment);
      return;
    }
    if (needsApproval) {
      setApprovalAppointment(appointment);
      setProposedChange({ paymentStatus: value });
      setRequestChangeOpen(true);
      return;
    }
    handleStatusChange(appointment._id, "paymentStatus", value);
  };

  const handleStatusChange = async (appointmentId, field, value) => {
    try {
      const response = await appointments.updateAppointment(appointmentId, {
        [field]: value,
      });

      if (response && (response.success || response.message || response.appointment)) {
        toast.success(`Appointment ${field === "status" ? "status" : "payment status"} updated successfully`);
        handleAppointmentUpdate();
      } else {
        toast.error(response?.message || "Failed to update appointment");
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast.error("An error occurred while updating status");
    }
  };

  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setOpenDropdownId(null); // Close dropdown when view details is clicked
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setEditModalOpen(true);
    setOpenDropdownId(null); // Close dropdown when edit is clicked
  };

  const handleUpdateStatus = (appointment) => {
    setStatusUpdateAppointment(appointment);
    setStatusUpdateModalOpen(true);
    setOpenDropdownId(null); // Close dropdown when update status is clicked
  };

  const handleCancelAppointment = (appointment) => {
    setCancelAppointment(appointment);
    setCancelModalOpen(true);
    setOpenDropdownId(null); // Close dropdown when cancel is clicked
  };

  const handleDeleteAppointment = (appointment) => {
    setAppointmentToDelete(appointment);
    setOpenDropdownId(null); // Close dropdown when delete is clicked
  };

  const handleDeleteSuccess = () => {
    setCurrentPage(1);
    fetchAppointments(); // Refresh the list
    setAppointmentToDelete(null);
  };

  // Handle date sort toggle
  const handleDateSort = () => {
    if (sortOrder === null) {
      setSortOrder("asc");
    } else if (sortOrder === "asc") {
      setSortOrder("desc");
    } else {
      setSortOrder(null);
    }
  };

  // Filter appointments based on search and filters
  const filteredAppointments = appointmentsList.filter((appointment) => {
    // Show all appointments if no filters are applied
    if (!searchQuery && !selectedStatus && !selectedSpeciality && !dateRange) {
      return true;
    }

    const matchesSearch = searchQuery
      ? appointment.patientId?.patient_full_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        appointment.patientId?.contact_number?.includes(searchQuery) ||
        appointment.doctorId?.fullName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        appointment.doctorId?.department
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
      : true;

    // Convert filter values back to original format for comparison
    const statusFilter = selectedStatus
      ? selectedStatus.replace(/-/g, " ").toLowerCase()
      : "";
    const specialityFilter =
      selectedSpeciality && selectedSpeciality !== "all-specialities"
        ? selectedSpeciality.replace(/-/g, " ").toLowerCase()
        : "";
    // Also try exact match with original dropdown values
    const statusExact = selectedStatus ? selectedStatus : "";
    const specialityExact = selectedSpeciality ? selectedSpeciality : "";

    // Handle "All" options - they should match everything
    const matchesStatus =
      selectedStatus && selectedStatus !== "all-status"
        ? appointment.status?.toLowerCase() === statusFilter ||
          appointment.status?.toLowerCase().includes(statusFilter) ||
          statusFilter.includes(appointment.status?.toLowerCase()) ||
          appointment.status?.toLowerCase() === statusExact ||
          appointment.status?.toLowerCase() === statusExact.replace(/-/g, " ")
        : true;

    const matchesSpeciality = specialityFilter
      ? appointment.speciality?.toLowerCase() === specialityFilter
      : true;

    const matchesDateRange = (() => {
      if (!dateRange) return true;

      // Parse appointment date
      const appointmentDate = appointment.appointment_date || appointment.date;
      if (!appointmentDate) return false;

      try {
        // Try to parse the date (handles various formats)
        let parsedAppointmentDate;
        if (typeof appointmentDate === "string") {
          parsedAppointmentDate = parseISO(appointmentDate);
        } else {
          parsedAppointmentDate = new Date(appointmentDate);
        }

        // If only from date is selected (single date)
        if (dateRange.from && !dateRange.to) {
          return isSameDay(parsedAppointmentDate, dateRange.from);
        }

        // If both from and to dates are selected (date range)
        if (dateRange.from && dateRange.to) {
          return isWithinInterval(parsedAppointmentDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          });
        }

        return true;
      } catch (error) {
        console.error("Error parsing appointment date:", error);
        return false;
      }
    })();

    const shouldInclude =
      matchesSearch && matchesStatus && matchesSpeciality && matchesDateRange;

    return shouldInclude;
  });

  // Sort filtered appointments by date
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (sortOrder === null) {
      // Sort by createdAt (most recent first)
      const createdA = new Date(a.createdAt || a.created_at || 0);
      const createdB = new Date(b.createdAt || b.created_at || 0);
      return createdB - createdA; // Most recent at top
    }

    const dateA = new Date(a.appointment_date || a.date);
    const dateB = new Date(b.appointment_date || b.date);

    if (sortOrder === "asc") {
      return dateA - dateB; // Ascending
    } else {
      return dateB - dateA; // Descending
    }
  });

  // Publish the currently visible (filtered + sorted, all pages) list upwards so
  // the header's "Export to Excel" action exports exactly what the admin sees.
  // Deps are the inputs that produce `sortedAppointments` — depending on the
  // array itself would re-fire on every render.
  useEffect(() => {
    onVisibleAppointmentsChange?.(sortedAppointments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appointmentsList,
    searchQuery,
    selectedStatus,
    selectedSpeciality,
    dateRange,
    sortOrder,
  ]);

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in progress":
        return "bg-orange-100 text-orange-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, "0")} ${suffix}`;
  };
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const paginatedAppointments = sortedAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const { pending: pendingApprovals, refresh: refreshApprovals } = usePendingApprovals(
    "appointment",
    needsApproval ? paginatedAppointments.map((a) => a._id) : []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading appointments...</span>
      </div>
    );
  }

  if (sortedAppointments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4">
          {loading ? "Loading..." : "No appointments found"}
        </div>
        {!loading && (
          <p className="text-gray-400">
            {searchQuery || selectedStatus || selectedSpeciality
              ? "Try adjusting your search criteria"
              : "No appointments available yet"}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg">
        <Table className="border-collapse border-0 w-full">
          <TableHeader>
          <TableRow className="bg-gray-50 border border-gray-200">
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              No.
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3 max-w-[150px]">
              Name
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              Gender
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              Contact
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              Department
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3 max-w-[150px]">
              Doctor
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              <button
                onClick={handleDateSort}
                className="flex items-center gap-1 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Appointment Date/Time
                {sortOrder === null && <ChevronsUpDown className="h-4 w-4" />}
                {sortOrder === "asc" && <ChevronUp className="h-4 w-4" />}
                {sortOrder === "desc" && <ChevronDown className="h-4 w-4" />}
              </button>
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              Fees
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3 text-center">
              Appointment Status
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3 text-center">
              Payment Status
            </TableHead>
            <TableHead className="text-[#7F7F7F] text-center font-normal py-3">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedAppointments.map((appointment, index) => {
            const isCancelled =
              appointment.status?.toLowerCase() === "cancelled";
            const isPaid = appointment.paymentStatus === "paid";
            const pendingApproval = needsApproval ? pendingApprovals[appointment._id] : null;
            return (
              <TableRow
                key={appointment._id}
                className="hover:bg-blue-50 border-b border-gray-100 transition-all duration-200 hover:border-blue-200 group"
              >
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200">
                  {index + 1}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200 break-words whitespace-normal max-w-[150px]">
                  {appointment.patientId?.patient_full_name || "Not Specified"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200">
                  {appointment.patientId?.gender || "Not Specified"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200">
                  {appointment.patientId?.contact_number || "Not Specified"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200">
                  {appointment.doctorId?.department || "Not Specified"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200 break-words whitespace-normal max-w-[150px]">
                  {dedupeDoctorTitle(appointment.doctorId?.fullName) || "Not Specified"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200">
                  <div className="text-sm">
                    <div className="font-medium text-gray-800">
                      {formatDate(appointment.appointment_date)}
                    </div>
                    {appointment.slot_start_time && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatTime(appointment.slot_start_time)}
                        {appointment.slot_end_time &&
                          ` – ${formatTime(appointment.slot_end_time)}`}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200 text-center">
                  {appointment.amount || appointment.doctorId?.fees || "Not Specified"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Select
                      value={appointment.status || "Pending"}
                      onValueChange={(val) => handleStatusChange(appointment._id, "status", val)}
                    >
                      <SelectTrigger
                        className={`text-xs !px-2 !py-1 !h-auto rounded-full border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [&_svg]:hidden ${getStatusBadgeColor(appointment.status)} cursor-pointer font-medium justify-center hover:brightness-95 transition-all`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {pendingApproval ? (
                      <PendingApprovalPill
                        request={pendingApproval}
                        onClick={() => openRequestStatus(appointment)}
                      />
                    ) : (
                    <Select
                      value={appointment.paymentStatus || "pending"}
                      onValueChange={(val) => handlePaymentStatusChange(appointment, val)}
                    >
                      <SelectTrigger
                        className={`text-xs !px-2 !py-1 !h-auto rounded-full border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [&_svg]:hidden ${getStatusBadgeColor(appointment.paymentStatus)} cursor-pointer font-medium justify-center hover:brightness-95 transition-all`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex justify-center gap-2">
                    <DropdownMenu
                      open={openDropdownId === appointment._id}
                      onOpenChange={(open) =>
                        setOpenDropdownId(open ? appointment._id : null)
                      }
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-gray-100 cursor-pointer"
                        >
                          <Ellipsis className="h-4 w-4 text-gray-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-64 bg-white border border-gray-200 rounded-lg shadow-lg"
                      >
                        <DropdownMenuItem
                          className="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleViewAppointment(appointment)}
                        >
                          <Eye className="h-4 w-4 mr-2 text-gray-500" />
                          View Details
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleEditAppointment(appointment)}
                        >
                          <Pencil className="h-4 w-4 mr-2 text-gray-500" />
                          Edit Appointment
                        </DropdownMenuItem>

                        {needsApproval && (
                          <DropdownMenuItem
                            className={`flex items-center px-2 py-2 text-sm cursor-pointer transition-colors ${
                              pendingApproval
                                ? "text-yellow-800 hover:bg-yellow-50"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                            onClick={() => openRequestStatus(appointment)}
                          >
                            <ClipboardList className="h-4 w-4 mr-2 text-yellow-600" />
                            Check Request Status
                          </DropdownMenuItem>
                        )}

                        {/* PAYMENT ACTION */}
                        {!isCancelled && !pendingApproval &&
                          (isPaid ? (
                            <DropdownMenuItem
                              className="flex items-center px-2 py-2 text-sm text-green-700 hover:bg-green-50 cursor-pointer transition-colors"
                              onClick={() => handleUpdateStatus(appointment)}
                            >
                              <Receipt className="h-4 w-4 mr-2 text-green-600" />
                              Payment Details
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="flex items-center px-2 py-2 text-sm text-green-600 hover:bg-green-50 cursor-pointer transition-colors"
                              onClick={() => handleUpdateStatus(appointment)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              {needsApproval ? "Request Mark as Paid" : "Mark as Paid"}
                            </DropdownMenuItem>
                          ))}

                        {/* CANCEL ACTION */}
                        {isCancelled ? (
                          <DropdownMenuItem className="flex items-center px-2 py-2 text-sm text-red-700 hover:bg-red-50 cursor-pointer transition-colors">
                            <Ban className="h-4 w-4 mr-2 text-red-600" />
                            Appointment Cancelled
                          </DropdownMenuItem>
                        ) : (
                          !isPaid && (
                            <DropdownMenuItem
                              className="flex items-center px-2 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                              onClick={() => handleCancelAppointment(appointment)}
                            >
                              <X className="h-4 w-4 mr-2 text-red-500" />
                              Cancel Appointment
                            </DropdownMenuItem>
                          )
                        )}

                        <DropdownMenuItem
                          className="flex items-center px-2 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                          onClick={() => handleDeleteAppointment(appointment)}
                        >
                          <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                          Delete Appointment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      <TablePagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onSave={handleAppointmentUpdate}
        />
      )}

      {/* Edit Appointment Modal */}
      <EditAppointmentModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        appointment={editingAppointment}
        onSave={handleAppointmentUpdate}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        appointment={appointmentToDelete}
        onClose={() => setAppointmentToDelete(null)}
        onDeleteSuccess={handleDeleteSuccess}
      />

      {/* Update Status Modal */}
      <UpdateStatusModal
        open={statusUpdateModalOpen}
        onOpenChange={setStatusUpdateModalOpen}
        appointment={statusUpdateAppointment}
        onSave={handleAppointmentUpdate}
      />

      <RequestChangeModal
        open={requestChangeOpen}
        onOpenChange={setRequestChangeOpen}
        entityType="appointment"
        record={approvalAppointment}
        changes={proposedChange}
        recordLabel={approvalAppointment?.patientId?.patient_full_name}
        onSent={refreshApprovals}
      />
      <RequestStatusModal
        open={requestStatusOpen}
        onOpenChange={handleRequestStatusOpenChange}
        entityType="appointment"
        record={approvalAppointment}
        recordLabel={approvalAppointment?.patientId?.patient_full_name}
        onChanged={handleAppointmentUpdate}
      />

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        appointment={cancelAppointment}
        onSuccess={handleAppointmentUpdate}
      />
    </div>
  );
}
