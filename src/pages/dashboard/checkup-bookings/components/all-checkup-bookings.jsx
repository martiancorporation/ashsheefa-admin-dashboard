import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Ellipsis,
  Eye,
  FlaskConical,
  Loader2,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import API from "@/api";

import { BookingDetailsModal } from "./booking-details-modal";
import { EditBookingModal } from "./edit-booking-modal";
import { MarkPaidModal } from "./mark-paid-modal";
import { RescheduleModal } from "./reschedule-modal";
import { DeleteConfirmationModal } from "./delete-confirmation-modal";
import { RequestChangeModal } from "@/pages/dashboard/approval-requests/components/request-change-modal";
import { RequestStatusModal } from "@/pages/dashboard/approval-requests/components/request-status-modal";
import {
  PendingApprovalPill,
  useNeedsApproval,
  usePendingApprovals,
} from "@/pages/dashboard/approval-requests/components/approval-helpers";
import {
  INLINE_STATUSES,
  PAYMENT_STATUSES,
  formatDate,
  formatTime,
  getPaymentBadgeColor,
  getStatusBadgeColor,
  toLocalDateStr,
} from "./constants";

const PER_PAGE = 10;

export default function AllCheckupBookings({
  searchQuery = "",
  selectedStatus = "",
  selectedPaymentStatus = "",
  dateRange = null,
  onBookingUpdate,
  onVisibleBookingsChange,
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [activeBooking, setActiveBooking] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
    setActiveBooking((current) => (current?._id === approvalLink ? current : { _id: approvalLink }));
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
  const { pending: pendingApprovals, refresh: refreshApprovals } = usePendingApprovals(
    "checkup_booking",
    needsApproval ? bookings.map((b) => b._id) : []
  );

  // Filtering happens server-side so paging stays correct across the whole set.
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PER_PAGE };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedStatus && selectedStatus !== "all-status") {
        params.checkup_status = selectedStatus;
      }
      if (selectedPaymentStatus && selectedPaymentStatus !== "all-payments") {
        params.paymentStatus = selectedPaymentStatus;
      }
      if (dateRange?.from) params.from_date = toLocalDateStr(dateRange.from);
      if (dateRange?.to) params.to_date = toLocalDateStr(dateRange.to);

      const res = await API.healthCheckupBookings.getAllBookings(params);

  
      if (!res || res.error) {
        setError(res?.error || "Failed to load checkup bookings.");
        setBookings([]);
        return;
      }

      const data = res.data || res;
      const list = data?.bookings || [];

      setBookings(list);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotal(data?.pagination?.total || list.length);
      onVisibleBookingsChange?.(list);
    } catch (err) {
      console.error("Error fetching checkup bookings:", err);
      setError("Failed to load checkup bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    searchQuery,
    selectedStatus,
    selectedPaymentStatus,
    dateRange,
    onVisibleBookingsChange,
  ]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    setPage((p) => (p === 1 ? p : 1));
  }, [searchQuery, selectedStatus, selectedPaymentStatus, dateRange]);

  const refresh = () => {
    fetchBookings();
    refreshApprovals();
    onBookingUpdate?.();
  };

  const handleInlineStatusChange = async (booking, value) => {
    try {
      const res = await API.healthCheckupBookings.updateBooking(booking._id, {
        checkup_status: value,
      });
      if (res?.success || res?.data) {
        toast.success("Checkup status updated");
        refresh();
      } else {
        toast.error(res?.error || res?.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Error updating checkup status:", err);
      toast.error("An error occurred while updating status");
    }
  };

  const openWith = (booking, setter) => {
    setActiveBooking(booking);
    setOpenDropdownId(null);
    setter(true);
  };

  const handlePaymentStatusChange = async (booking, value) => {
    if (value === (booking.paymentStatus || "pending")) return;
    if (value === "paid") {
      openWith(booking, setPaidOpen);
      return;
    }
    if (needsApproval) {
      setProposedChange({ paymentStatus: value });
      openWith(booking, setRequestChangeOpen);
      return;
    }

    try {
      const res = await API.healthCheckupBookings.updateBooking(booking._id, {
        paymentStatus: value,
      });
      if (res?.success || res?.data) {
        toast.success("Payment status updated");
        refresh();
      } else {
        toast.error(res?.error || res?.message || "Failed to update payment status");
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
      toast.error("An error occurred while updating payment status");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        <span className="text-sm">Loading checkup bookings…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchBookings} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
        <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center">
          <FlaskConical className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-gray-600 font-medium">No checkup bookings found</p>
        <p className="text-sm text-gray-400">
          {searchQuery || selectedStatus || selectedPaymentStatus || dateRange
            ? "Try clearing the filters."
            : "Bookings will appear here once patients book a package."}
        </p>
      </div>
    );
  }

  return (
    <>
      <Table className="border border-gray-200">
        <TableHeader>
          <TableRow className="bg-[#FAFAFA] border-b border-gray-200">
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              #
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              Patient
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              Gender
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              Contact
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              Package
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3 text-center">
              Tests
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3">
              Collection Date/Time
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3 text-center">
              Amount
            </TableHead>
            <TableHead className="text-[#7F7F7F] font-normal border-r border-gray-200 py-3 text-center">
              Checkup Status
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
          {bookings.map((booking, index) => {
            const isPaid = booking.paymentStatus === "paid";
            const pendingApproval = needsApproval ? pendingApprovals[booking._id] : null;
            const rescheduled = booking.reschedule_history?.length || 0;
            return (
              <TableRow
                key={booking._id}
                className="hover:bg-blue-50 border-b border-gray-100 transition-all duration-200 hover:border-blue-200 group"
              >
                <TableCell className="border-r border-gray-200 py-3">
                  {(page - 1) * PER_PAGE + index + 1}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 break-words whitespace-normal max-w-[150px]">
                  {booking.patientId?.patient_full_name || "Not Specified"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3">
                  {booking.patientId?.gender || "—"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3">
                  {booking.patientId?.contact_number || booking.contact_number || "—"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 break-words whitespace-normal max-w-[180px]">
                  {booking.checkup_name || booking.checkupId?.checkup_name || "—"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 text-center">
                  {booking.tests_count ?? "—"}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3">
                  <div className="text-sm">
                    <div className="font-medium text-gray-800">
                      {formatDate(booking.collection_date)}
                    </div>
                    {booking.slot_start_time && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatTime(booking.slot_start_time)}
                        {booking.slot_end_time &&
                          ` – ${formatTime(booking.slot_end_time)}`}
                      </div>
                    )}
                    {rescheduled > 0 && (
                      <div className="text-[11px] text-purple-600 mt-0.5">
                        Rescheduled ×{rescheduled}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 text-center">
                  ₹{Number(booking.amount || 0).toLocaleString("en-IN")}
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 text-center">
                  <Select
                    value={booking.checkup_status || "Booked"}
                    onValueChange={(val) => handleInlineStatusChange(booking, val)}
                  >
                    <SelectTrigger
                      className={`text-xs !px-2 !py-1 !h-auto rounded-full border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [&_svg]:hidden ${getStatusBadgeColor(
                        booking.checkup_status
                      )} mx-auto cursor-pointer font-medium justify-center hover:brightness-95 transition-all`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INLINE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                      {/* Postponed can't be set here — it needs a new date */}
                      {booking.checkup_status === "Postponed" && (
                        <SelectItem value="Postponed" disabled>
                          Postponed
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="border-r border-gray-200 py-3 text-center">
                  {pendingApproval ? (
                    <PendingApprovalPill
                      request={pendingApproval}
                      onClick={() => openWith(booking, setRequestStatusOpen)}
                    />
                  ) : (
                  <Select
                    value={booking.paymentStatus || "pending"}
                    onValueChange={(val) => handlePaymentStatusChange(booking, val)}
                  >
                    <SelectTrigger
                      className={`text-xs !px-2 !py-1 !h-auto rounded-full border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [&_svg]:hidden ${getPaymentBadgeColor(
                        booking.paymentStatus
                      )} mx-auto cursor-pointer font-medium capitalize justify-center hover:brightness-95 transition-all`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex justify-center gap-2">
                    <DropdownMenu
                      open={openDropdownId === booking._id}
                      onOpenChange={(o) => setOpenDropdownId(o ? booking._id : null)}
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
                        className="w-56 bg-white border border-gray-200 rounded-lg shadow-lg"
                      >
                        <DropdownMenuItem
                          className="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          onClick={() => openWith(booking, setDetailsOpen)}
                        >
                          <Eye className="h-4 w-4 mr-2 text-gray-500" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          onClick={() => openWith(booking, setEditOpen)}
                        >
                          <Pencil className="h-4 w-4 mr-2 text-gray-500" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          onClick={() => openWith(booking, setRescheduleOpen)}
                        >
                          <CalendarClock className="h-4 w-4 mr-2 text-purple-600" />
                          Reschedule
                        </DropdownMenuItem>
                        {needsApproval && (
                          <DropdownMenuItem
                            className={`flex items-center px-2 py-2 text-sm cursor-pointer transition-colors ${
                              pendingApproval
                                ? "text-yellow-800 hover:bg-yellow-50"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                            onClick={() => openWith(booking, setRequestStatusOpen)}
                          >
                            <ClipboardList className="h-4 w-4 mr-2 text-yellow-600" />
                            Check Request Status
                          </DropdownMenuItem>
                        )}
                        {pendingApproval ? null : isPaid ? (
                          <DropdownMenuItem
                            className="flex items-center px-2 py-2 text-sm text-green-700 hover:bg-green-50 cursor-pointer transition-colors"
                            onClick={() => openWith(booking, setPaidOpen)}
                          >
                            <Receipt className="h-4 w-4 mr-2 text-green-600" />
                            Payment Details
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="flex items-center px-2 py-2 text-sm text-green-600 hover:bg-green-50 cursor-pointer transition-colors"
                            onClick={() => openWith(booking, setPaidOpen)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            {needsApproval ? "Request Mark as Paid" : "Mark as Paid"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="flex items-center px-2 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                          onClick={() => openWith(booking, setDeleteOpen)}
                        >
                          <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                          Delete
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

      {/* Pagination */}
      <div className="flex items-center justify-between py-4">
        <p className="text-sm text-gray-500">
          Showing {(page - 1) * PER_PAGE + 1}–
          {Math.min(page * PER_PAGE, total)} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <BookingDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        booking={activeBooking}
      />
      <EditBookingModal
        open={editOpen}
        onOpenChange={setEditOpen}
        booking={activeBooking}
        onSave={refresh}
      />
      <MarkPaidModal
        open={paidOpen}
        onOpenChange={setPaidOpen}
        booking={activeBooking}
        onSave={refresh}
      />
      <RescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        booking={activeBooking}
        onSave={refresh}
      />
      <RequestChangeModal
        open={requestChangeOpen}
        onOpenChange={setRequestChangeOpen}
        entityType="checkup_booking"
        record={activeBooking}
        changes={proposedChange}
        recordLabel={activeBooking?.patientId?.patient_full_name}
        onSent={refreshApprovals}
      />
      <RequestStatusModal
        open={requestStatusOpen}
        onOpenChange={handleRequestStatusOpenChange}
        entityType="checkup_booking"
        record={activeBooking}
        recordLabel={activeBooking?.patientId?.patient_full_name}
        onChanged={refresh}
      />
      <DeleteConfirmationModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        booking={activeBooking}
        onDeleted={refresh}
      />
    </>
  );
}
