import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
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
import healthCheckup from "@/api/healthCheckup";
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

  // ── Package picker (packages are posted from the dashboard, like doctors) ──
  const [allPackages, setAllPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [packageDropdownOpen, setPackageDropdownOpen] = useState(false);
  const packageWrapperRef = useRef(null);

  const [form, setForm] = useState({
    patient_full_name: "",
    date_of_birth: "",
    gender: "",
    contact_number: "",
    address: "",
    collection_date: "",
    slot_start_time: "",
    collection_type: "hospital",
    checkup_status: "",
    notes: "",
  });

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  // Close the package dropdown on an outside click.
  useEffect(() => {
    const handler = (e) => {
      if (packageWrapperRef.current && !packageWrapperRef.current.contains(e.target)) {
        setPackageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Seed from the booking, then fill in what the list API leaves out ──
  useEffect(() => {
    if (!open || !booking) return;
    const pat = booking.patientId || {};

    setErrors({});
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
      checkup_status: booking.checkup_status || "Booked",
      notes: booking.notes || "",
    });

    const pkgId =
      typeof booking.checkupId === "object" ? booking.checkupId?._id : booking.checkupId;
    setSelectedPackageId(pkgId || "");
    setPackageSearch(booking.checkup_name || booking.checkupId?.checkup_name || "");

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

  // ── Fetch the dashboard's packages while the modal is open ──
  useEffect(() => {
    if (!open || allPackages.length) return;
    setPackagesLoading(true);
    healthCheckup
      .getAllHealthCheckups({ page: 1, limit: 100 })
      .then((res) => setAllPackages(res?.data?.health_checkups || []))
      .catch(() => setAllPackages([]))
      .finally(() => setPackagesLoading(false));
  }, [open, allPackages.length]);

  const selectedPackage = useMemo(
    () => allPackages.find((p) => p._id === selectedPackageId) || null,
    [allPackages, selectedPackageId]
  );

  const filteredPackages = useMemo(() => {
    if (!packageSearch || selectedPackageId) return allPackages;
    const q = packageSearch.toLowerCase();
    return allPackages.filter(
      (p) =>
        p.checkup_name?.toLowerCase().includes(q) ||
        p.checkup_title?.toLowerCase().includes(q)
    );
  }, [allPackages, packageSearch, selectedPackageId]);

  const packagePrice = selectedPackage
    ? Number(selectedPackage.discount_price || 0)
    : Number(booking?.package_price || 0);
  const registrationFee = Number(booking?.registration_fee || 0);
  const total = packagePrice + registrationFee;
  const testsCount = selectedPackage
    ? selectedPackage.tests?.length ?? 0
    : booking?.tests_count ?? 0;

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

      // Package — id and the denormalised fields the list/table read
      checkupId: selectedPackageId || undefined,
      checkup_name:
        selectedPackage?.checkup_name || booking.checkup_name || undefined,
      tests_count: testsCount,

      // Collection
      collection_date: form.collection_date || undefined,
      ...(SHOW_TIME_SLOTS
        ? {
            slot_start_time: form.slot_start_time || undefined,
            slot_end_time: deriveEnd(form.slot_start_time),
          }
        : {}),
      collection_type: form.collection_type || undefined,

      // Money — always the package's own price, the field is read-only
      package_price: packagePrice,
      registration_fee: registrationFee,
      amount: total,

      checkup_status: form.checkup_status || undefined,
      notes: form.notes.trim(),
    };

    setLoading(true);
    try {
      const res = await API.healthCheckupBookings.updateBooking(booking._id, payload);
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
            To postpone a checkup, use Reschedule instead — it keeps a record of
            the change.
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

          {/* ── Checkup Details ────────────────────────────────── */}
          <div className="border rounded-xl p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-700">Checkup Details</p>

            {/* Package combobox */}
            <div ref={packageWrapperRef} className="relative">
              <Label className="text-sm font-medium">Package</Label>
              <Input
                className="mt-1 w-full"
                placeholder={
                  packagesLoading ? "Loading packages..." : "Search package by name..."
                }
                value={packageSearch}
                autoComplete="off"
                onFocus={() => setPackageDropdownOpen(true)}
                onClick={() => setPackageDropdownOpen(true)}
                onChange={(e) => {
                  setPackageSearch(e.target.value);
                  setPackageDropdownOpen(true);
                  setSelectedPackageId("");
                }}
              />
              {selectedPackageId && (
                <p className="text-xs text-green-600 mt-1 px-1">✓ Package selected</p>
              )}
              {packageDropdownOpen &&
                !selectedPackageId &&
                (filteredPackages.length > 0 ? (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredPackages.map((pkg) => (
                      <button
                        key={pkg._id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-b border-gray-100 last:border-0"
                        onClick={() => {
                          setSelectedPackageId(pkg._id);
                          setPackageSearch(pkg.checkup_name || "");
                          setPackageDropdownOpen(false);
                        }}
                      >
                        <span className="font-medium">{pkg.checkup_name}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          {[
                            pkg.checkup_title,
                            pkg.tests?.length ? `${pkg.tests.length} tests` : null,
                            pkg.discount_price ? `₹${pkg.discount_price}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : packageSearch ? (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-3 py-3">
                    <p className="text-sm text-slate-500 text-center">
                      No packages found.
                    </p>
                  </div>
                ) : null)}
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

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label className="text-sm font-medium">Tests Included</Label>
                <Input
                  className="mt-1 bg-slate-100 text-slate-700 cursor-not-allowed"
                  value={testsCount}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Price — read-only, taken from the selected package */}
            <div className="rounded-md border border-slate-200 p-3 space-y-3">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Package Price</Label>
                  <p className="text-xs text-slate-500">
                    Set from the package — cannot be edited
                  </p>
                </div>
                {/* cursor-not-allowed lives on the wrapper: the disabled Input
                    has pointer-events-none, so it can't show a cursor. */}
                <div className="flex items-center gap-1 cursor-not-allowed">
                  <span className="text-sm text-gray-900">₹</span>
                  <Input
                    className="w-32 text-right bg-slate-100 text-slate-700 cursor-not-allowed"
                    type="number"
                    value={packagePrice}
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
              <Label className="text-sm font-medium">Checkup Status</Label>
              <Select
                value={form.checkup_status}
                onValueChange={(v) => setField("checkup_status", v)}
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
                  {booking?.checkup_status === "Postponed" && (
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
