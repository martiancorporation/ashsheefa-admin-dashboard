import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import API from "@/api";
import { INLINE_STATUSES, toLocalDateStr } from "./constants";
import {
  COLLECTION_TYPES,
  CollectionPicker,
  isOfferedSlot,
  SHOW_TIME_SLOTS,
} from "../../components/collection-picker";

// Same shape as the appointment edit modal's validation.
const patientSchema = z.object({
  patient_full_name: z
    .string()
    .transform((v) => v.replace(/[^a-zA-Z\s]/g, "").replace(/\s+/g, " ").trim())
    .refine((v) => /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(v), {
      message: "Please enter a valid full name",
    }),
  contact_number: z
    .string()
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .refine((v) => /^\d{10}$/.test(v), {
      message: "Enter a valid 10-digit number",
    }),
});

const toDateInput = (val) => (val ? toLocalDateStr(val) : "");

// Collection slots are 30 minutes; derive the end so reception never types it.
const deriveEnd = (start) => {
  if (!start) return undefined;
  const [h, m] = start.split(":").map(Number);
  if (isNaN(h)) return undefined;
  const total = h * 60 + (m || 0) + 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
};

export function EditBookingModal({ open, onOpenChange, booking, onSave }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [tests, setTests] = useState([]);

  const [form, setForm] = useState({
    patient_full_name: "",
    date_of_birth: "",
    gender: "",
    contact_number: "",
    address: "",
    collection_date: "",
    slot_start_time: "",
    collection_type: "hospital",
    test_status: "",
    notes: "",
  });

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  // ── Seed from the booking, then fill in what the list API leaves out ──
  useEffect(() => {
    if (!open || !booking) return;
    const pat = booking.patientId || {};

    setErrors({});
    setTests(
      (booking.tests || []).map((t) => ({
        test_name: t.test_name || "",
        amount: t.amount ?? "",
      }))
    );
    setForm({
      patient_full_name: pat.patient_full_name || "",
      date_of_birth: toDateInput(pat.date_of_birth),
      gender: pat.gender || "",
      contact_number: pat.contact_number || booking.contact_number || "",
      address: pat.address || "",
      collection_date: toDateInput(booking.collection_date),
      slot_start_time: isOfferedSlot(booking.slot_start_time)
        ? booking.slot_start_time
        : "",
      collection_type: booking.collection_type || "hospital",
      test_status: booking.test_status || "Booked",
      notes: booking.notes || "",
    });

    const patientId = pat._id || booking.patientId;
    if (patientId && typeof patientId === "string") {
      API.patient
        .getPatientDataById(patientId)
        .then((res) => {
          const full = res?.data?.patient || res?.data || res;
          if (full && full._id) {
            setForm((prev) => ({
              ...prev,
              patient_full_name: full.patient_full_name || prev.patient_full_name,
              date_of_birth: toDateInput(full.date_of_birth) || prev.date_of_birth,
              gender: full.gender || prev.gender,
              contact_number: full.contact_number || prev.contact_number,
              address: full.address || prev.address,
            }));
          }
        })
        .catch(() => {
          // Form already holds whatever the list gave us.
        });
    }
  }, [open, booking]);

  const setTest = (index, key, value) =>
    setTests((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [key]: value } : t))
    );

  const addTest = () => setTests((prev) => [...prev, { test_name: "", amount: "" }]);
  const removeTest = (index) =>
    setTests((prev) => prev.filter((_, i) => i !== index));

  // Total follows the rows, so it can't drift from what's actually booked.
  const testsTotal = tests.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const registrationFee = Number(booking?.registration_fee || 0);
  const total = testsTotal + registrationFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!booking?._id) return;

    const parsed = patientSchema.safeParse({
      patient_full_name: form.patient_full_name,
      contact_number: form.contact_number,
    });
    if (!parsed.success) {
      const fieldErrors = {};
      parsed.error.issues.forEach((i) => {
        if (!fieldErrors[i.path[0]]) fieldErrors[i.path[0]] = i.message;
      });
      setErrors(fieldErrors);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});

    // A booking with no tests on it isn't a booking.
    const cleanTests = tests
      .map((t) => ({
        test_name: t.test_name.trim(),
        amount: Number(t.amount || 0),
      }))
      .filter((t) => t.test_name);

    if (!cleanTests.length) {
      toast.error("A booking needs at least one test");
      return;
    }

    // A booking with no collection slot leaves the lab nothing to work to.
    if (!form.collection_date) {
      toast.error("Please pick the collection date");
      return;
    }
    if (SHOW_TIME_SLOTS && !form.slot_start_time) {
      toast.error("Please pick the collection time");
      return;
    }

    const payload = {
      // Patient
      patient_full_name: parsed.data.patient_full_name,
      date_of_birth: form.date_of_birth || undefined,
      gender: form.gender || undefined,
      contact_number: parsed.data.contact_number,
      address: form.address?.trim() || undefined,

      // Tests
      tests: cleanTests,
      tests_count: cleanTests.length,

      // Collection
      collection_date: form.collection_date || undefined,
      ...(SHOW_TIME_SLOTS
        ? {
            slot_start_time: form.slot_start_time || undefined,
            slot_end_time: deriveEnd(form.slot_start_time),
          }
        : {}),
      collection_type: form.collection_type || undefined,

      // Money — derived from the rows above, never typed directly
      tests_total: cleanTests.reduce((sum, t) => sum + t.amount, 0),
      registration_fee: registrationFee,
      amount: cleanTests.reduce((sum, t) => sum + t.amount, 0) + registrationFee,

      test_status: form.test_status || undefined,
      notes: form.notes.trim(),
    };

    setLoading(true);
    try {
      const res = await API.testBookings.updateBooking(booking._id, payload);
      if (res?.success || res?.data) {
        toast.success("Booking updated");
        onSave?.();
        onOpenChange(false);
      } else {
        toast.error(res?.error || res?.message || "Failed to update booking");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("An error occurred while updating the booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            To postpone these tests, use Reschedule instead — it keeps a record
            of the change.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Patient Details ─────────────────────────────────── */}
          <div className="border rounded-xl p-4 space-y-4 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Patient Details</p>

            <div>
              <Label className="text-sm font-medium">
                Full Name<span className="text-red-500">*</span>
              </Label>
              <Input
                className="mt-1"
                value={form.patient_full_name}
                onChange={(e) =>
                  setField(
                    "patient_full_name",
                    e.target.value
                      .replace(/[^a-zA-Z\s]/g, "")
                      .replace(/\s+/g, " ")
                      .trimStart()
                  )
                }
                placeholder="Patient full name"
              />
              {errors.patient_full_name && (
                <p className="text-xs text-red-500 mt-1">{errors.patient_full_name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Date of Birth</Label>
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  min="1900-01-01"
                  value={form.date_of_birth}
                  onChange={(e) => setField("date_of_birth", e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setField("gender", v)}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">
                  Contact Number<span className="text-red-500">*</span>
                </Label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                    +91
                  </span>
                  <Input
                    className="rounded-l-none"
                    value={form.contact_number}
                    onChange={(e) =>
                      setField("contact_number", e.target.value.replace(/\D/g, ""))
                    }
                    maxLength={10}
                    placeholder="Mobile number"
                  />
                </div>
                {errors.contact_number && (
                  <p className="text-xs text-red-500 mt-1">{errors.contact_number}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Address</Label>
                <Input
                  className="mt-1"
                  placeholder="Enter full address"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Test Details ───────────────────────────────────── */}
          <div className="border rounded-xl p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-700">Test Details</p>

            {/* Booked tests — edited in place, no catalogue to pick from */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Booked Tests<span className="text-red-500">*</span>
              </Label>
              {tests.map((t, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input
                    className="flex-1"
                    value={t.test_name}
                    onChange={(e) => setTest(i, "test_name", e.target.value)}
                    placeholder="Test name"
                  />
                  <div className="flex items-center gap-1 w-32">
                    <span className="text-sm text-gray-900">₹</span>
                    <Input
                      type="number"
                      min="0"
                      className="text-right"
                      value={t.amount}
                      onChange={(e) => setTest(i, "amount", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 text-red-500 hover:bg-red-50 shrink-0"
                    onClick={() => removeTest(i)}
                    aria-label={`Remove ${t.test_name || "test"}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!tests.length && (
                <p className="text-xs text-slate-500">
                  No tests on this booking yet — add at least one.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTest}
                className="mt-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add test
              </Button>
            </div>

            <CollectionPicker
              date={form.collection_date}
              time={form.slot_start_time}
              onDateChange={(v) => setField("collection_date", v)}
              onTimeChange={(v) => setField("slot_start_time", v)}
              currentDate={booking?.collection_date}
              currentTime={booking?.slot_start_time}
              dateRequired
            />

            <div>
              <Label className="text-sm font-medium">Collection Location</Label>
              <Select
                value={form.collection_type}
                onValueChange={(v) => setField("collection_type", v)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {COLLECTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} disabled={t.disabled}>
                      {t.label}
                      {t.disabled && (
                        <span className="text-xs text-slate-400 ml-1">
                          (not available yet)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Money — every figure derived from the rows above */}
            <div className="rounded-md border border-slate-200 p-3 space-y-3">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Tests Total</Label>
                  <p className="text-xs text-slate-500">
                    Added up from the tests above — cannot be edited
                  </p>
                </div>
                <div className="flex items-center gap-1 cursor-not-allowed">
                  <span className="text-sm text-gray-900">₹</span>
                  <Input
                    className="w-32 text-right bg-slate-100 text-slate-700 cursor-not-allowed"
                    type="number"
                    value={testsTotal}
                    disabled
                    readOnly
                  />
                </div>
              </div>
              <div className="flex justify-between items-center gap-4">
                <Label className="text-sm font-medium">Registration Fee</Label>
                <div className="flex items-center gap-1 cursor-not-allowed">
                  <span className="text-sm text-gray-900">₹</span>
                  <Input
                    className="w-32 text-right bg-slate-100 text-slate-700 cursor-not-allowed"
                    type="number"
                    value={registrationFee}
                    disabled
                    readOnly
                  />
                </div>
              </div>
              <div className="flex justify-between items-center gap-4 border-t border-slate-200 pt-3">
                <Label className="text-sm font-semibold">Total</Label>
                <span className="text-base font-bold text-gray-900 pr-3">
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder="Internal notes for reception / lab"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>
          </div>

          {/* ── Status ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Test Status</Label>
              <Select
                value={form.test_status}
                onValueChange={(v) => setField("test_status", v)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {INLINE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  {/* Postponed can't be set here — it needs a new date */}
                  {booking?.test_status === "Postponed" && (
                    <SelectItem value="Postponed" disabled>
                      Postponed
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
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
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
