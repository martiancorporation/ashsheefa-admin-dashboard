import jsPDF from "jspdf";
import { toast } from "sonner";
import { formatCardDate, CARD_WIDTH_MM, CARD_HEIGHT_MM, LAYOUT } from "../components/ayushman-card";

const { padX: PAD_X, valueX: VALUE_X, sexX: SEX_X, titleY: TITLE_Y, firstRowY: FIRST_ROW_Y, titlePt, textPt } = LAYOUT;
const ROW_STEP = (CARD_HEIGHT_MM - LAYOUT.bottom - FIRST_ROW_Y) / 6;

// Shrink long names/doctors so they never run off the sticker.
const fitText = (pdf, text, x, y, maxWidth, size) => {
  let s = size;
  pdf.setFontSize(s);
  while (s > 5 && pdf.getTextWidth(text) > maxWidth) pdf.setFontSize((s -= 0.5));
  pdf.text(text, x, y);
  pdf.setFontSize(size);
};

/** Draws the sticker as vector text on a page exactly CARD_WIDTH_MM × CARD_HEIGHT_MM. */
const buildCardPdf = (record) => {
  const pdf = new jsPDF({
    orientation: CARD_WIDTH_MM > CARD_HEIGHT_MM ? "landscape" : "portrait",
    unit: "mm",
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(titlePt);
  pdf.text("ASHSHEEFA HOSPITAL", CARD_WIDTH_MM / 2, TITLE_Y, { align: "center" });

  const valueWidth = CARD_WIDTH_MM - VALUE_X - PAD_X;
  const rows = [
    ["ID:", record.patient_id],
    ["NAME:", record.patient_name],
    ["Age:", record.age],
    ["Consultant:", record.consultant],
    ["Secondary:", record.secondary],
    ["DOA:", formatCardDate(record.doa)],
    ["Bed No.:", record.bed_no],
  ];

  rows.forEach(([label, value], i) => {
    const y = FIRST_ROW_Y + i * ROW_STEP;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(textPt);
    pdf.text(label, PAD_X, y);
    pdf.setFont("helvetica", "normal");
    const isAgeRow = label === "Age:";
    fitText(pdf, String(value || "").toUpperCase(), VALUE_X, y, isAgeRow ? SEX_X - VALUE_X - 2 : valueWidth, textPt);
    if (isAgeRow) {
      pdf.setFont("helvetica", "normal");
      pdf.text("Sex:", SEX_X, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(record.gender || "").toUpperCase(), SEX_X + 7, y);
    }
  });

  return pdf;
};

const fileNameFor = (record) =>
  `${record.patient_id || "Ayushman"}_admission_card`.replace(/[^a-zA-Z0-9_-]/g, "_");

export const downloadCardPdf = (record) => {
  try {
    buildCardPdf(record).save(`${fileNameFor(record)}.pdf`);
  } catch (error) {
    console.error("Error generating card PDF:", error);
    toast.error("Failed to generate PDF. Please try again.");
  }
};

/** Opens the same card-sized PDF with the print dialog already triggered. */
export const printCardDirect = (record) => {
  const pdf = buildCardPdf(record);
  pdf.autoPrint();
  const win = window.open(pdf.output("bloburl"), "_blank");
  if (!win) toast.error("Please allow popups to print the card");
};
