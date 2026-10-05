import {
  exportRowsToExcel,
  toExcelDate,
  flattenAddress,
} from "@/lib/exportToExcel";
import { MODE_LABEL, formatTime } from "./constants";
import { SHOW_TIME_SLOTS } from "../../components/collection-picker";

const DATE_FMT = "dd-mmm-yyyy";
const DATETIME_FMT = "dd-mmm-yyyy hh:mm AM/PM";

const money = (value) => {
  const n = Number(value);
  return value === null || value === undefined || isNaN(n) ? "" : n;
};

const TEST_BOOKING_COLUMNS = [
  { header: "No.", width: 6, value: (_b, i) => i + 1 },

  // ── Patient ──
  {
    header: "Patient Name",
    width: 24,
    value: (b) => b.patientId?.patient_full_name || "",
  },
  {
    header: "Date of Birth",
    width: 14,
    numFmt: DATE_FMT,
    value: (b) => toExcelDate(b.patientId?.date_of_birth),
  },
  { header: "Gender", width: 10, value: (b) => b.patientId?.gender || "" },
  {
    header: "Contact Number",
    width: 16,
    value: (b) => b.patientId?.contact_number || b.contact_number || "",
  },
  {
    header: "Address",
    width: 34,
    value: (b) => flattenAddress(b.patientId?.address),
  },

  // ── Tests ──
  {
    header: "Tests Booked",
    width: 14,
    value: (b) => b.tests_count ?? b.tests?.length ?? "",
  },
  {
    // One cell per booking rather than one row per test, so a row still means
    // a booking and the totals below stay comparable.
    header: "Tests",
    width: 60,
    value: (b) =>
      (b.tests || [])
        .map((t) => `${t.test_name} (Rs ${Number(t.amount || 0)})`)
        .join("; "),
  },

  // ── Collection ──
  {
    header: "Collection Date",
    width: 18,
    numFmt: DATE_FMT,
    value: (b) => toExcelDate(b.collection_date),
  },
  ...(SHOW_TIME_SLOTS
    ? [
        {
          header: "Slot Start Time",
          width: 15,
          value: (b) => formatTime(b.slot_start_time),
        },
        {
          header: "Slot End Time",
          width: 15,
          value: (b) => formatTime(b.slot_end_time),
        },
      ]
    : []),
  {
    header: "Location",
    width: 16,
    value: (b) => (b.collection_type === "home" ? "Home collection" : "Hospital visit"),
  },
  {
    header: "Test Status",
    width: 18,
    value: (b) => b.test_status || "",
  },
  {
    header: "Times Rescheduled",
    width: 17,
    value: (b) => b.reschedule_history?.length ?? 0,
  },

  // ── Payment ──
  { header: "Tests Total", width: 14, numFmt: "0.00", value: (b) => money(b.tests_total) },
  {
    header: "Registration Fee",
    width: 16,
    numFmt: "0.00",
    value: (b) => money(b.registration_fee),
  },
  { header: "Total Amount", width: 14, numFmt: "0.00", value: (b) => money(b.amount) },
  { header: "Payment Status", width: 16, value: (b) => b.paymentStatus || "" },
  {
    header: "Payment Mode",
    width: 16,
    value: (b) => MODE_LABEL[b.paymentMode] || b.paymentMode || "",
  },

  // ── Additional ──
  { header: "Notes", width: 40, value: (b) => b.notes || "" },
  {
    header: "Created At",
    width: 20,
    numFmt: DATETIME_FMT,
    value: (b) => toExcelDate(b.createdAt),
  },
  {
    header: "Last Updated",
    width: 20,
    numFmt: DATETIME_FMT,
    value: (b) => toExcelDate(b.updatedAt),
  },
];

const timestampedName = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `test-bookings-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}.xlsx`;
};

/**
 * Export the given test bookings (already filtered the way the admin sees
 * them) to an .xlsx file.
 */
export async function exportTestBookingsToExcel(bookings) {
  await exportRowsToExcel({
    rows: bookings,
    columns: TEST_BOOKING_COLUMNS,
    fileName: timestampedName(),
    sheetName: "Test Bookings",
  });
}
