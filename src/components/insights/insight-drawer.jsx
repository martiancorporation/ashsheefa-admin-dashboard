import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";

/**
 * Slide-over panel holding the full version of a ranked list, with search and
 * per-column sorting.
 *
 * The rows are the ones already in the dashboard payload — every list ships up
 * to 40 rows, the card renders the top 6, and this shows the rest. Sorting and
 * filtering are therefore local: no second request, and no spinner between
 * clicking a column header and seeing it reorder.
 */
export default function InsightDrawer({
  open,
  onClose,
  title,
  subtitle,
  rows = [],
  columns = [],
  searchKey,
  searchPlaceholder = "Search…",
  note,
  // Sabar's expandable rows: clicking one opens the records behind it in place
  // (one row open at a time), keyed by `rowKey`.
  renderExpanded,
  rowKey = "label",
  width = 520,
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "desc" });
  const [expanded, setExpanded] = useState(null);

  // Reset per-open, so reopening a drawer never inherits the last search.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSort({ key: null, dir: "desc" });
      setExpanded(null);
    }
  }, [open]);

  // Escape closes, and the page behind must not scroll while the overlay is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const visible = useMemo(() => {
    let out = rows;
    if (query && searchKey) {
      const q = query.toLowerCase();
      out = out.filter((r) => String(r?.[searchKey] ?? "").toLowerCase().includes(q));
    }
    if (sort.key) {
      // Copy before sorting — Array.prototype.sort mutates, and `rows` is the
      // same array the cards behind the drawer are rendering from.
      out = [...out].sort((a, b) => {
        const av = a?.[sort.key];
        const bv = b?.[sort.key];
        // Blanks ("—", no value) stay at the bottom in either direction.
        const aBlank = av === null || av === undefined;
        const bBlank = bv === null || bv === undefined;
        if (aBlank || bBlank) return aBlank === bBlank ? 0 : aBlank ? 1 : -1;
        const diff =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av ?? "").localeCompare(String(bv ?? ""));
        return sort.dir === "asc" ? diff : -diff;
      });
    }
    return out;
  }, [rows, query, searchKey, sort]);

  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" },
    );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        role="presentation"
      />

      <aside className="relative flex h-full w-full flex-col bg-white shadow-2xl" style={{ maxWidth: width }}>
        <header className="flex items-start justify-between gap-3 border-b border-[#EEEEEE] px-5 py-4">
          <div className="min-w-0">
            <h5 className="truncate text-[15px] font-bold text-[#121212]">{title}</h5>
            {subtitle ? (
              <p className="mt-0.5 text-[12px] text-[#9A9A9A]">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-[8px] p-1.5 text-[#636363] hover:bg-[#F2F2F2]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {searchKey ? (
          <div className="border-b border-[#EEEEEE] px-5 py-3">
            <div className="flex items-center gap-2 rounded-[8px] border border-[#EEEEEE] bg-[#FBFBFB] px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#9A9A9A]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-[13px] text-[#121212] outline-none placeholder:text-[#9A9A9A]"
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-[#EEEEEE]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A] ${
                      col.numeric ? "whitespace-nowrap text-right" : "text-left"
                    }`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-[#0056B2]"
                      >
                        {col.label}
                        <span className={sort.key === col.key ? "text-[#0056B2]" : "opacity-30"}>
                          {sort.key === col.key && sort.dir === "asc" ? "▲" : "▼"}
                        </span>
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-5 py-10 text-center text-[12px] text-[#9A9A9A]"
                  >
                    Nothing to show
                  </td>
                </tr>
              ) : (
                visible.map((row, i) => {
                  const key = String(row?.[rowKey] ?? i);
                  const isOpen = Boolean(renderExpanded) && expanded === key;
                  const cell = (col) =>
                    col.render ? col.render(row, i) : String(row?.[col.key] ?? "—");
                  return (
                    <Fragment key={key}>
                      <tr
                        onClick={renderExpanded ? () => setExpanded(isOpen ? null : key) : undefined}
                        aria-expanded={renderExpanded ? isOpen : undefined}
                        className={`border-b border-[#F5F5F5] hover:bg-[#FBFBFB] ${
                          renderExpanded ? "cursor-pointer" : ""
                        } ${isOpen ? "bg-[#F4F8FD]" : ""}`}
                      >
                        {columns.map((col, c) => (
                          <td
                            key={col.key}
                            className={`px-5 py-2.5 text-[13px] text-[#121212] ${
                              col.numeric
                                ? "whitespace-nowrap text-right tabular-nums"
                                : "text-left [overflow-wrap:anywhere]"
                            }`}
                          >
                            {renderExpanded && c === 0 ? (
                              <span className="flex items-center gap-1.5">
                                <ChevronRight
                                  className={`h-3.5 w-3.5 shrink-0 text-[#9A9A9A] transition-transform ${
                                    isOpen ? "rotate-90 text-[#006ACA]" : ""
                                  }`}
                                />
                                <span className="min-w-0">{cell(col)}</span>
                              </span>
                            ) : (
                              cell(col)
                            )}
                          </td>
                        ))}
                      </tr>
                      {isOpen ? (
                        <tr className="border-b border-[#F5F5F5] bg-[#F4F8FD]">
                          <td colSpan={columns.length} className="px-5 pb-3 pt-0">
                            {renderExpanded(row)}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {note ? (
          <footer className="border-t border-[#EEEEEE] px-5 py-3 text-[11px] leading-4 text-[#9A9A9A]">
            {note}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
