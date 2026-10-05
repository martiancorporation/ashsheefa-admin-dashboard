import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import API from "@/api";
import { formatDate, formatTime, toLocalDateStr } from "./constants";
import {
  CollectionPicker,
  isOfferedSlot,
  SHOW_TIME_SLOTS,
} from "../../components/collection-picker";

export function RescheduleModal({ open, onOpenChange, booking, onSave }) {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open && booking) {
      setDate(booking.collection_date ? toLocalDateStr(booking.collection_date) : "");
      setStartTime(isOfferedSlot(booking.slot_start_time) ? booking.slot_start_time : "");
      setReason("");
    }
  }, [open, booking]);

  // Slots are 30 minutes; derive the end so reception never types it.
  const deriveEnd = (start) => {
    if (!start) return "";
    const [h, m] = start.split(":").map(Number);
    if (isNaN(h)) return "";
    const total = h * 60 + (m || 0) + 30;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
      total % 60
    ).padStart(2, "0")}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // A postponement with no new date leaves the patient without one at all.
    if (!date) {
      toast.error("Please pick the new collection date");
      return;
    }
    if (SHOW_TIME_SLOTS && !startTime) {
      toast.error("Please pick the new collection time");
      return;
    }
    const picked = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (picked < today) {
      toast.error("The new date cannot be in the past");
      return;
    }

    const currentDate = booking?.collection_date
      ? toLocalDateStr(booking.collection_date)
      : "";
    const sameTime =
      !SHOW_TIME_SLOTS || startTime === (booking?.slot_start_time || "");
    if (date === currentDate && sameTime) {
      toast.error(
        SHOW_TIME_SLOTS
          ? "Pick a different date or time to reschedule"
          : "Pick a different date to reschedule"
      );
      return;
    }

    setLoading(true);
    try {
      const res = await API.healthCheckupBookings.rescheduleBooking(booking._id, {
        collection_date: date,
        ...(SHOW_TIME_SLOTS && startTime
          ? { slot_start_time: startTime, slot_end_time: deriveEnd(startTime) }
          : {}),
        reason: reason.trim(),
      });

      if (res?.success || res?.data) {
        toast.success("Booking rescheduled");
        onSave?.();
        onOpenChange(false);
      } else {
        toast.error(res?.error || res?.message || "Failed to reschedule booking");
      }
    } catch (error) {
      console.error("Error rescheduling booking:", error);
      toast.error("An error occurred while rescheduling");
    } finally {
      setLoading(false);
    }
  };

  const patientName = booking?.patientId?.patient_full_name || "—";
  const rescheduledCount = booking?.reschedule_history?.length || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-[#4B4B4B]">
            <CalendarClock className="w-4 h-4 text-purple-600" />
            Reschedule Checkup
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            A new collection date is required. The booking moves to
            &ldquo;Postponed&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium text-gray-800">Patient: </span>
              {patientName}
            </p>
            <p>
              <span className="font-medium text-gray-800">Package: </span>
              {booking?.checkup_name || "—"}
            </p>
            <p>
              <span className="font-medium text-gray-800">Current: </span>
              {formatDate(booking?.collection_date)}
              {booking?.slot_start_time && ` · ${formatTime(booking.slot_start_time)}`}
            </p>
            {rescheduledCount > 0 && (
              <p className="text-xs text-purple-700">
                Already rescheduled {rescheduledCount}{" "}
                {rescheduledCount === 1 ? "time" : "times"}
              </p>
            )}
          </div>

          <CollectionPicker
            date={date}
            time={startTime}
            onDateChange={setDate}
            onTimeChange={setStartTime}
            currentDate={booking?.collection_date}
            currentTime={booking?.slot_start_time}
            dateLabel="New Date"
            timeLabel="New Time"
            dateRequired
          />

          <div className="space-y-1.5">
            <Label className="text-[#4A4A4B] text-sm">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. patient requested a later date"
              className="bg-[#FBFBFB] border-[#DDDDDD] shadow-none resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Reschedule"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
