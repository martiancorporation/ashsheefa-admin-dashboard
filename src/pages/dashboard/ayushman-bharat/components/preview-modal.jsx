import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import AyushmanCard, { formatCardDate, CARD_WIDTH_MM, CARD_HEIGHT_MM } from "./ayushman-card";
import { downloadCardPdf, printCardDirect } from "../utils/pdf-generator";

export function PreviewModal({ open, onOpenChange, record }) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] p-6 bg-white rounded-xl shadow-2xl border border-gray-100">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>Admission Card Preview</span>
                <span className="text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Exact Label Size ({CARD_WIDTH_MM}mm × {CARD_HEIGHT_MM}mm)
                </span>
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-1">
                Preview of the exact printed sticker / label. The exported PDF matches this exact card size.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Realistic Card Container */}
        <div className="py-6 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100/70 rounded-xl border border-gray-200/80 p-6 my-2">
          {/* Card Presentation (Yellow label backing mimic like Image 1) */}
          <div className="p-3 bg-[#FCF8E3]/80 rounded-lg border border-[#F4E9B3] shadow-inner flex items-center justify-center">
            <AyushmanCard record={record} />
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ID: <strong className="text-gray-700">{record.patient_id}</strong>
            </span>
            <span>•</span>
            <span>{record.patient_name}</span>
            <span>•</span>
            <span>DOA: {formatCardDate(record.doa)}</span>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-gray-600 hover:bg-gray-100"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => printCardDirect(record)}
              className="flex items-center gap-2 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Print Sticker</span>
            </Button>

            <Button
              type="button"
              onClick={() => downloadCardPdf(record)}
              className="flex items-center gap-2 bg-[#0B5CF9] hover:bg-[#094ccc] text-white shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF (Card Size)</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PreviewModal;
