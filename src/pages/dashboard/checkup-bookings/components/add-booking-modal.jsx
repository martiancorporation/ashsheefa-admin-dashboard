import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { PAYMENT_MODES } from "./constants";
import {
  COLLECTION_TYPES,
  CollectionPicker,
  SHOW_TIME_SLOTS,
} from "../../components/collection-picker";

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

const EMPTY = {
  patient_full_name: "",
  date_of_birth: "",
  gender: "",
  email: "",
  contact_number: "",
  address: "",
  collection_date: "",
  slot_start_time: "",
  collection_type: "hospital",
  paymentMode: "cash",
  notes: "",
};

/**
 * Counter booking for a health checkup package. Mirrors Add Appointment: the
 * admin types the patient (matched on phone server-side, so no duplicate
 * records) and picks a package. No payment is taken here — the booking lands
 * unpaid and reception settles it through Mark as Paid.
 */
export function AddBookingModal({ open, onOpenChange, onSave }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(EMPTY);

  const [allPackages, setAllPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [packageDropdownOpen, setPackageDropdownOpen] = useState(false);
  const packageWrapperRef = useRef(null);

  // Existing patient vs typed-in patient, same choice Add Appointment offers.
  const [useExistingPatient, setUseExistingPatient] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");

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

  // Blank the form each time it opens, so a previous booking never leaks in.
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setErrors({});
    setUseExistingPatient(false);
    setPatientSearch("");
    setSelectedPatientId("");
    setSelectedPackageId("");
    setPackageSearch("");
  }, [open]);

  useEffect(() => {
    if (!open || allPackages.length) return;
    setPackagesLoading(true);
    healthCheckup
      .getAllHealthCheckups({ page: 1, limit: 100 })
      .then((res) => setAllPackages(res?.data?.health_checkups || []))
      .catch(() => setAllPackages([]))
      .finally(() => setPackagesLoading(false));
  }, [open, allPackages.length]);

  // Patients are fetched only once the toggle is flipped — the list is large
  // and most counter bookings are for someone new.
  useEffect(() => {
    if (!useExistingPatient || patientsLoaded) return;
    API.patient.getAllPatients({ page: 1, limit: 500 }).then((res) => {
      if (res?.success) {
        setPatients(res.data || []);
        setPatientsLoaded(true);
      }
    });
  }, [useExistingPatient, patientsLoaded]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (pt) =>
        pt.patient_full_name?.toLowerCase().includes(q) ||
        pt.contact_number?.includes(patientSearch) ||
        pt.uhid?.toLowerCase().includes(q)
    );
  }, [patientSearch, patients]);

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

  // Shown as a guide only. The server recomputes both figures — the ₹50
  // registration fee is waived for a patient who is already registered, and
  // reception can't know that until the phone number is matched.
  const packagePrice = Number(selectedPackage?.discount_price || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPackageId) {
      toast.error("Please pick a checkup package");
      return;
    }
    if (!form.collection_date) {
      toast.error("Please pick the collection date");
      return;
    }
    if (SHOW_TIME_SLOTS && !form.slot_start_time) {
      toast.error("Please pick the collection time");
      return;
    }

    // An existing patient is just an id; a new one gets validated first. The
    // server takes either — and it also matches a typed number against existing
    // records, so a duplicate can't be created by accident.
    let patientPayload;
    if (useExistingPatient) {
      if (!selectedPatientId) {
        toast.error("Please select a patient");
        return;
      }
      patientPayload = { patientId: selectedPatientId };
    } else {
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
      patientPayload = {
        patient_full_name: parsed.data.patient_full_name,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        email: form.email?.trim() || undefined,
        contact_number: parsed.data.contact_number,
        address: form.address?.trim() || undefined,
      };
    }
    setErrors({});

    setLoading(true);
    try {
      const res = await API.healthCheckupBookings.addBookingByAdmin({
        ...patientPayload,

        checkupId: selectedPackageId,
        collection_date: form.collection_date,
        ...(SHOW_TIME_SLOTS
          ? {
              slot_start_time: form.slot_start_time || undefined,
              slot_end_time: deriveEnd(form.slot_start_time),
            }
          : {}),
        collection_type: form.collection_type,
        paymentMode: form.paymentMode,
        notes: form.notes.trim(),
      });

      if (res?.success || res?.data) {
        toast.success("Checkup booking created");
        onSave?.();
        onOpenChange(false);
      } else {
        toast.error(res?.error || res?.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("Error creating checkup booking:", error);
      toast.error("An error occurred while creating the booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Checkup Booking</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            The booking is created unpaid — settle it with Mark as Paid once the
            patient pays.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Patient: existing record, or typed in ─────────────── */}
          <div className="flex items-center justify-between border rounded-xl p-4 bg-slate-50">
            <div>
              <Label className="font-semibold text-sm">Use Existing Patient</Label>
              <p className="text-xs text-slate-500">
                Toggle to select from patient records
              </p>
            </div>
            <Switch
              checked={useExistingPatient}
              onCheckedChange={(val) => {
                setUseExistingPatient(val);
                // Clear whichever side is being abandoned, so a half-filled
                // patient can't be submitted alongside a selected one.
                setSelectedPatientId("");
                setPatientSearch("");
                setErrors({});
                setForm((prev) => ({
                  ...prev,
                  patient_full_name: "",
                  date_of_birth: "",
                  gender: "",
                  email: "",
                  contact_number: "",
                  address: "",
                }));
              }}
            />
          </div>

          {useExistingPatient && (
            <div className="relative">
              <Input
                placeholder="Search by name, phone, or UHID..."
                value={patientSearch}
                autoComplete="off"
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setSelectedPatientId("");
                }}
                className="w-full"
              />
              {selectedPatientId && (
                <p className="text-xs text-green-600 mt-1 px-1">✓ Patient selected</p>
              )}
              {filteredPatients.length > 0 && patientSearch && !selectedPatientId && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
                  {filteredPatients.map((pt) => (
                    <button
                      key={pt._id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-b border-gray-100 last:border-0"
                      onClick={() => {
                        setSelectedPatientId(pt._id);
                        setPatientSearch(pt.patient_full_name || "");
                      }}
                    >
                      <span className="font-medium">{pt.patient_full_name}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {[pt.contact_number, pt.uhid].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {filteredPatients.length === 0 && patientSearch && (
                <p className="text-sm text-slate-500 text-center py-2">
                  No patients found. Try different search terms.
                </p>
              )}
            </div>
          )}

          {!useExistingPatient && (
            <>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                <p className="text-sm text-yellow-800">
                  ⚠️ Enter the details of the patient the checkup is for.
                </p>
              </div>

              <div className="border rounded-xl p-4 space-y-4 bg-slate-50">

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
            </>

          )}

          {/* ── Checkup Details ────────────────────────────────── */}
          <div className="border rounded-xl p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-700">Checkup Details</p>

            <div ref={packageWrapperRef} className="relative">
              <Label className="text-sm font-medium">
                Package<span className="text-red-500">*</span>
              </Label>
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
                <Label className="text-sm font-medium">Expected Payment Mode</Label>
                <Select
                  value={form.paymentMode}
                  onValueChange={(v) => setField("paymentMode", v)}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price preview — the server has the final say */}
            <div className="rounded-md border border-slate-200 p-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Package Price</span>
                <span className="text-gray-900">
                  ₹{packagePrice.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Registration Fee</span>
                <span className="text-gray-900">₹50 for a new patient, else ₹0</span>
              </div>
              <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                The total is calculated by the server — the ₹50 fee is waived for
                a patient who is already registered.
              </p>
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
              {loading ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
