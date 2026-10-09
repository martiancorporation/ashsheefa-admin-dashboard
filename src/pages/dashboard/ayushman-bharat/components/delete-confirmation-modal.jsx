import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function DeleteConfirmationModal({ record, onClose, onDeleteSuccess }) {
  const [loading, setLoading] = useState(false);

  if (!record) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await API.ayushmanBharat.deleteRecord(record._id);
      if (res?.success) {
        toast.success("Ayushman Bharat record deleted successfully");
        onClose();
        if (onDeleteSuccess) onDeleteSuccess();
      } else {
        toast.error(res?.error || "Failed to delete record");
      }
    } catch (err) {
      console.error("Error deleting Ayushman Bharat record:", err);
      toast.error("An error occurred while deleting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Delete Admission Record
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Are you sure you want to delete this record? This cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-medium text-red-900 mb-2">Record Details</h3>
          <div className="text-sm text-red-700 space-y-1">
            <p>
              <strong>ID:</strong> {record.patient_id}
            </p>
            <p>
              <strong>Patient Name:</strong> {record.patient_name}
            </p>
            <p>
              <strong>Consultant:</strong> {record.consultant}
            </p>
            {record.bed_no && (
              <p>
                <strong>Bed No:</strong> {record.bed_no}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Record"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteConfirmationModal;
