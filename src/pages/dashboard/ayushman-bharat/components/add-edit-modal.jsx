import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import API from "@/api";
import AyushmanCard, { CARD_WIDTH_MM, CARD_HEIGHT_MM } from "./ayushman-card";

export function AddEditModal({
  open,
  onOpenChange,
  recordToEdit = null,
  onSuccess,
}) {
  const isEditing = Boolean(recordToEdit?._id);

  const [formData, setFormData] = useState({
    patient_id: "",
    patient_name: "",
    age: "",
    gender: "MALE",
    consultant: "",
    secondary: "",
    doa: new Date().toISOString().split("T")[0],
    bed_no: "",
    status: "Admitted",
    remarks: "",
  });

  const [doctorsList, setDoctorsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Load doctors for easy selection
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await API.doctor.getAllDoctors(1, 100);
        if (res?.data?.doctors) {
          setDoctorsList(res.data.doctors);
        } else if (Array.isArray(res?.data)) {
          setDoctorsList(res.data);
        }
      } catch (err) {
        console.warn("Could not fetch doctors list:", err);
      }
    };
    if (open) {
      fetchDoctors();
    }
  }, [open]);

  // Reset or populate form when modal opens
  useEffect(() => {
    if (recordToEdit) {
      const formattedDate = recordToEdit.doa
        ? new Date(recordToEdit.doa).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      setFormData({
        patient_id: recordToEdit.patient_id || "",
        patient_name: recordToEdit.patient_name || "",
        age: recordToEdit.age || "",
        gender: recordToEdit.gender || "MALE",
        consultant: recordToEdit.consultant || "",
        secondary: recordToEdit.secondary || "",
        doa: formattedDate,
        bed_no: recordToEdit.bed_no || "",
        status: recordToEdit.status || "Admitted",
        remarks: recordToEdit.remarks || "",
      });
    } else {
      resetForm();
    }
  }, [recordToEdit, open]);

  // Blank ID → backend assigns the next sequential IP<YY><MM><DD><NNNN>
  const resetForm = () => {
    setFormData((prev) => ({
      ...prev,
      patient_id: "",
      patient_name: "",
      age: "",
      gender: "MALE",
      consultant: "",
      secondary: "",
      doa: new Date().toISOString().split("T")[0],
      bed_no: "",
      status: "Admitted",
      remarks: "",
    }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.patient_name.trim()) {
      toast.error("Please enter patient name");
      return;
    }
    if (!formData.age.trim()) {
      toast.error("Please enter age");
      return;
    }
    if (!formData.consultant.trim()) {
      toast.error("Please enter primary consultant doctor");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        patient_id: formData.patient_id.trim().toUpperCase(),
        patient_name: formData.patient_name.trim().toUpperCase(),
        age: formData.age.trim().toUpperCase(),
        gender: formData.gender.toUpperCase(),
        consultant: formData.consultant.trim().toUpperCase(),
        secondary: formData.secondary ? formData.secondary.trim().toUpperCase() : "",
        bed_no: formData.bed_no ? formData.bed_no.trim().toUpperCase() : "",
        doa: formData.doa,
      };

      let res;
      if (isEditing) {
        res = await API.ayushmanBharat.updateRecord(recordToEdit._id, payload);
      } else {
        res = await API.ayushmanBharat.addRecord(payload);
      }

      if (res?.success || res?.data) {
        toast.success(
          isEditing
            ? "Ayushman Bharat record updated successfully"
            : "Ayushman Bharat record added successfully"
        );
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res?.error || "Failed to save record");
      }
    } catch (err) {
      console.error("Error saving Ayushman Bharat record:", err);
      toast.error("Failed to save record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-white rounded-xl shadow-xl">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldPlus className="w-6 h-6 text-[#0B5CF9]" />
            <span>
              {isEditing
                ? "Edit Ayushman Bharat Admission Record"
                : "New Ayushman Bharat Admission Entry"}
            </span>
          </DialogTitle>
          <p className="text-xs text-gray-500">
            Enter the patient details below. The card preview updates automatically.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Top Row: Patient ID & Patient Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="patient_id" className="text-xs font-semibold text-gray-700">
                  ID / IP Number
                </Label>
              </div>
              <Input
                id="patient_id"
                placeholder="Leave blank to auto-generate"
                value={formData.patient_id}
                onChange={(e) => handleChange("patient_id", e.target.value)}
                className="uppercase font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="patient_name" className="text-xs font-semibold text-gray-700 block mb-1.5">
                Patient Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="patient_name"
                placeholder="e.g. MR. ROHIT MONDAL"
                value={formData.patient_name}
                onChange={(e) => handleChange("patient_name", e.target.value)}
                className="uppercase font-medium text-sm"
                required
              />
            </div>
          </div>

          {/* Row 2: Age, Gender, Bed No */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="age" className="text-xs font-semibold text-gray-700 block mb-1.5">
                Age <span className="text-red-500">*</span>
              </Label>
              <Input
                id="age"
                placeholder="e.g. 27 or 75Y"
                value={formData.age}
                onChange={(e) => handleChange("age", e.target.value)}
                className="uppercase text-sm"
                required
              />
            </div>

            <div>
              <Label htmlFor="gender" className="text-xs font-semibold text-gray-700 block mb-1.5">
                Sex / Gender <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(val) => handleChange("gender", val)}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select Sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">MALE</SelectItem>
                  <SelectItem value="FEMALE">FEMALE</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bed_no" className="text-xs font-semibold text-gray-700 block mb-1.5">
                Bed No. (Optional)
              </Label>
              <Input
                id="bed_no"
                placeholder="e.g. 102 / ICU-2"
                value={formData.bed_no}
                onChange={(e) => handleChange("bed_no", e.target.value)}
                className="uppercase text-sm"
              />
            </div>
          </div>

          {/* Row 3: Consultant & Secondary Doctor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="consultant" className="text-xs font-semibold text-gray-700 block mb-1.5">
                Consultant Doctor <span className="text-red-500">*</span>
              </Label>
              <Input
                id="consultant"
                placeholder="e.g. DR. SUDIP DEB"
                value={formData.consultant}
                onChange={(e) => handleChange("consultant", e.target.value)}
                className="uppercase text-sm font-medium"
                list="doctors-consultant-list"
                required
              />
              <datalist id="doctors-consultant-list">
                {doctorsList.map((doc, idx) => (
                  <option
                    key={doc._id || idx}
                    value={doc.fullName}
                  />
                ))}
              </datalist>
            </div>

            <div>
              <Label htmlFor="secondary" className="text-xs font-semibold text-gray-700 block mb-1.5">
                Secondary Doctor (Optional)
              </Label>
              <Input
                id="secondary"
                placeholder="e.g. DR. ROHITASWA MANDAL"
                value={formData.secondary}
                onChange={(e) => handleChange("secondary", e.target.value)}
                className="uppercase text-sm font-medium"
                list="doctors-secondary-list"
              />
              <datalist id="doctors-secondary-list">
                {doctorsList.map((doc, idx) => (
                  <option
                    key={doc._id || idx}
                    value={doc.fullName}
                  />
                ))}
              </datalist>
            </div>
          </div>

          {/* Row 4: DOA & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doa" className="text-xs font-semibold text-gray-700 block mb-1.5">
                Date of Admission (DOA) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="doa"
                type="date"
                value={formData.doa}
                onChange={(e) => handleChange("doa", e.target.value)}
                className="text-sm"
                required
              />
            </div>

            <div>
              <Label htmlFor="status" className="text-xs font-semibold text-gray-700 block mb-1.5">
                Admission Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) => handleChange("status", val)}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admitted">Admitted</SelectItem>
                  <SelectItem value="Discharged">Discharged</SelectItem>
                  <SelectItem value="Under Observation">Under Observation</SelectItem>
                  <SelectItem value="Transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live Sticker Card Preview */}
          <div className="pt-2">
            <Label className="text-xs font-semibold text-gray-600 block mb-2">
              Live Slip Preview ({CARD_WIDTH_MM}mm × {CARD_HEIGHT_MM}mm Sticker)
            </Label>
            <div className="flex justify-center bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 overflow-x-auto">
              <AyushmanCard record={formData} />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#0B5CF9] hover:bg-[#094ccc] text-white flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? "Update Record" : "Save & Generate Card"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddEditModal;
