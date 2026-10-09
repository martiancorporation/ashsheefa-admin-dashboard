import React from "react";
import moment from "moment";

// Client's label stock (CA435 label printer, 72 × 50 mm). Preview, PDF and print all use these.
export const CARD_WIDTH_MM = 72;
export const CARD_HEIGHT_MM = 50;
export const LAYOUT = {
  padX: 3, // mm, left/right margin
  valueX: 20, // mm, where values start
  sexX: 44, // mm, where "Sex:" starts on the Age row
  titleY: 6, // mm, title baseline
  firstRowY: 12.5, // mm, first row baseline
  bottom: 4, // mm, space below last row
  titlePt: 10,
  textPt: 8,
};

/** DD-MM-YYYY, as printed on the sticker (e.g. "16-09-2026"). */
export const formatCardDate = (dateVal) => {
  if (!dateVal) return "";
  const m = moment(dateVal);
  return m.isValid() ? m.format("DD-MM-YYYY") : String(dateVal);
};

// Mirrors the layout drawn in utils/pdf-generator.js, in real mm, so the preview is true size.
const label = { fontWeight: 700, width: `${LAYOUT.valueX - LAYOUT.padX}mm`, flexShrink: 0 };
const value = {
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export function AyushmanCard({ record }) {
  if (!record) return null;

  const rows = [
    ["ID:", record.patient_id],
    ["NAME:", record.patient_name],
    ["Age:", record.age],
    ["Consultant:", record.consultant],
    ["Secondary:", record.secondary],
    ["DOA:", formatCardDate(record.doa)],
    ["Bed No.:", record.bed_no],
  ];

  return (
    <div
      style={{
        width: `${CARD_WIDTH_MM}mm`,
        height: `${CARD_HEIGHT_MM}mm`,
        padding: `2mm ${LAYOUT.padX}mm ${LAYOUT.bottom - 1.5}mm`,
        boxSizing: "border-box",
        background: "#fff",
        color: "#000",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: `${LAYOUT.textPt}pt`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: `${LAYOUT.titlePt}pt`, marginBottom: "1.5mm" }}>
        ASHSHEEFA HOSPITAL
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {rows.map(([l, v]) => (
          <div key={l} style={{ display: "flex", alignItems: "baseline" }}>
            <span style={label}>{l}</span>
            {l === "Age:" ? (
              <>
                <span style={{ ...value, width: `${LAYOUT.sexX - LAYOUT.valueX}mm` }}>{v}</span>
                <span style={{ marginRight: "1.5mm" }}>Sex:</span>
                <span style={{ ...value, fontWeight: 700 }}>{record.gender}</span>
              </>
            ) : (
              <span style={value}>{v}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AyushmanCard;
