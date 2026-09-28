import { Fragment, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FlaskConical,
  Loader2,
  Search,
  TestTubeDiagonal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TablePagination from "@/pages/components/common/Pagination";
import API from "@/api";
import { unwrap } from "../rbac/helpers";
import {
  APPROVALS_CHANGED_EVENT,
  ApprovalStatusBadge,
  ENTITY_TYPES,
  REQUEST_TYPE_LABEL,
  formatDateTime,
  formatValue,
  showsNewValueOnly,
} from "./components/approval-helpers";

const LIMIT = 10;

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const TYPE_ICON = {
  appointment: { icon: ClipboardCheck, cls: "bg-blue-50 text-blue-600" },
  checkup_booking: { icon: FlaskConical, cls: "bg-amber-50 text-amber-600" },
  test_booking: { icon: TestTubeDiagonal, cls: "bg-purple-50 text-purple-600" },
};

// Lets the sidebar badge refresh straight away instead of on its next poll.
const announceChange = () => window.dispatchEvent(new Event(APPROVALS_CHANGED_EVENT));

const paymentChange = (request) =>
  request.changes.find((c) => c.field === "paymentStatus") || request.changes[0] || {};

/**
 * Superadmin's Approval Requests drawer: payment-status changes raised by other
 * admins wait here. Approving applies the change to the record; rejecting
 * leaves the record untouched. Superadmin-only by default — like Roles, Users
 * and Permissions, it is not a grantable drawer.
 */
export default function ApprovalRequestsPage() {
  // `?request=<id>` comes from the "new approval request" email: show that one.
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("request");

  const [tab, setTab] = useState("pending");
  const [entityType, setEntityType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [requests, setRequests] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  const [expanded, setExpanded] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [busyIds, setBusyIds] = useState(() => new Set());

  // Reject dialog: one id or several (bulk).
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchCounts = useCallback(async () => {
    const res = await API.approvalRequests.GetCounts();
    if (res?.counts) setCounts(res.counts);
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = focusId ? { id: focusId } : { status: tab, page, limit: LIMIT };
      if (!focusId && entityType !== "all") params.entity_type = entityType;
      if (!focusId && search) params.search = search;
      const res = await API.approvalRequests.GetAllRequests(params);
      if (res && !res.error) {
        const list = res.requests || [];
        setRequests(list);
        // Drop selections for rows that have left this list (e.g. just
        // approved/rejected), so the bulk bar doesn't linger.
        setSelected((prev) => {
          if (prev.size === 0) return prev;
          const ids = new Set(list.map((r) => r.id));
          const next = new Set([...prev].filter((id) => ids.has(id)));
          return next.size === prev.size ? prev : next;
        });
        setTotalPages(res.pagination?.total_pages || 1);
        // Land on the tab it now belongs to (it may have been decided since
        // the email went out), opened.
        if (focusId && list[0]) {
          if (["pending", "approved", "rejected"].includes(list[0].status)) setTab(list[0].status);
          setExpanded(new Set([list[0].id]));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [tab, page, entityType, search, focusId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const showAll = () => setSearchParams({});

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // A new filter or tab starts from a clean slate (the emailed request keeps
  // its row open).
  useEffect(() => {
    setSelected(new Set());
    if (!focusId) setExpanded(new Set());
  }, [tab, page, entityType, search, focusId]);

  const reload = () => {
    fetchRequests();
    fetchCounts();
    announceChange();
  };

  const changeTab = (key) => {
    if (focusId) showAll();
    setTab(key);
    setPage(1);
  };

  const applySearch = () => {
    if (focusId) showAll();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    if (focusId) showAll();
    setSearchInput("");
    setSearch("");
    setEntityType("all");
    setPage(1);
  };

  const toggle = (setter, id) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = requests.length > 0 && requests.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(requests.map((r) => r.id)));

  const markBusy = (ids, on) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  const handleApprove = async (id) => {
    markBusy([id], true);
    try {
      const res = unwrap(await API.approvalRequests.ApproveRequest(id));
      if (res?.request) {
        toast.success("Approved — the change has been applied");
        reload();
      }
    } finally {
      markBusy([id], false);
    }
  };

  const reportBulk = (res, verb) => {
    if (!res) return;
    if (res.succeeded) toast.success(`${res.succeeded} request${res.succeeded === 1 ? "" : "s"} ${verb}`);
    if (res.failed) {
      const firstError = res.results?.find((r) => !r.ok)?.error;
      toast.error(`${res.failed} could not be ${verb}`, { description: firstError || undefined });
    }
  };

  const handleBulkApprove = async () => {
    const ids = [...selected];
    markBusy(ids, true);
    try {
      const res = unwrap(await API.approvalRequests.BulkReview({ ids, action: "approve" }));
      reportBulk(res, "approved");
      if (res) reload();
    } finally {
      markBusy(ids, false);
    }
  };

  const openReject = (ids) => {
    setRejectTarget(ids);
    setRejectNote("");
  };

  const confirmReject = async () => {
    const ids = rejectTarget || [];
    setRejecting(true);
    markBusy(ids, true);
    try {
      if (ids.length === 1) {
        const res = unwrap(
          await API.approvalRequests.RejectRequest(ids[0], { review_reason: rejectNote.trim() })
        );
        if (res?.request) toast.success("Request rejected");
        if (res) reload();
      } else {
        const res = unwrap(
          await API.approvalRequests.BulkReview({ ids, action: "reject", review_reason: rejectNote.trim() })
        );
        reportBulk(res, "rejected");
        if (res) reload();
      }
      setRejectTarget(null);
    } finally {
      setRejecting(false);
      markBusy(ids, false);
    }
  };

  const isPending = tab === "pending";
  const columns = isPending ? 5 : 4;

  return (
    <>
      <div className="w-full flex items-center space-x-2">
        <div className="w-[1.5px] h-[15px] bg-[#7F7F7F]"></div>
        <p className="text-[#4B4B4B] font-medium">Approval Requests</p>
      </div>

      <div className="w-full h-[calc(100%-30px)] overflow-y-auto eme-scroll">
        <div className="bg-white border border-gray-200 rounded-md">
          {/* Tabs + filters */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 px-4 pt-3 border-b border-gray-200">
            <div className="flex items-end gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => changeTab(t.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 -mb-px cursor-pointer whitespace-nowrap transition-colors ${
                    tab === t.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-[#4B4B4B] hover:text-[#323232]"
                  }`}
                >
                  {t.label}
                  {t.key === "pending" && counts.pending > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xs">
                      {counts.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pb-3">
              <Select
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[170px] h-9 bg-white">
                  <SelectValue placeholder="Choose One" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(ENTITY_TYPES).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  placeholder="Employee or patient name"
                  className="pl-9 h-9 w-[220px]"
                />
              </div>
              <Button onClick={applySearch} className="h-9 px-5 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
                Search
              </Button>
              <Button onClick={clearFilters} variant="outline" className="h-9 px-5 cursor-pointer">
                Clear
              </Button>
            </div>
          </div>

          {focusId && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-sm">
              <span className="text-yellow-900">
                {requests.length
                  ? "Showing the request from your email."
                  : loading
                    ? "Opening the request from your email…"
                    : "That request could not be found."}
              </span>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={showAll}>
                Show all requests
              </Button>
            </div>
          )}

          {/* Bulk bar */}
          {isPending && selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm">
              <span className="text-blue-800">{selected.size} selected</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => openReject([...selected])}
                >
                  <X className="w-4 h-4 mr-1 text-red-600" /> Reject selected
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                  onClick={handleBulkApprove}
                >
                  <Check className="w-4 h-4 mr-1" /> Approve selected
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-[#F1F3F5] text-left">
                <tr>
                  {isPending && (
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 font-medium text-[#323232]">Type</th>
                  <th className="px-4 py-3 font-medium text-[#323232]">Requested by</th>
                  <th className="px-4 py-3 font-medium text-[#323232]">Details</th>
                  <th className="px-4 py-3 font-medium text-[#323232]">
                    {isPending ? "Actions" : "Reviewed"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns} className="py-12">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
                      </div>
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={columns} className="py-12 text-center text-gray-500">
                      {isPending ? "Nothing is waiting for approval." : `No ${tab} requests.`}
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const icon = TYPE_ICON[request.entity_type] || TYPE_ICON.appointment;
                    const Icon = icon.icon;
                    const change = paymentChange(request);
                    const open = expanded.has(request.id);
                    const busy = busyIds.has(request.id);
                    const others = request.changes.filter((c) => c.field !== change.field);

                    return (
                      <Fragment key={request.id}>
                        <tr className="border-b border-gray-100 align-middle">
                          {isPending && (
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selected.has(request.id)}
                                onChange={() => toggle(setSelected, request.id)}
                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                                aria-label="Select request"
                              />
                            </td>
                          )}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${icon.cls}`}>
                                <Icon className="w-5 h-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium text-[#323232]">{request.entity_type_label}</p>
                                <p className="text-xs uppercase tracking-wide text-gray-500">
                                  {REQUEST_TYPE_LABEL[request.request_type] || "Change"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-[#323232]">{request.requested_by?.name || "—"}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[260px]">
                              {[request.requested_by?.role?.toLowerCase(), request.requested_by?.email]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-xs text-gray-500">From</p>
                                <p className="font-medium text-[#323232]">{formatValue(change.field, change.from)}</p>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span className="w-5 border-t border-dashed border-gray-300" />
                                <span className="whitespace-nowrap">{change.field_label || "Payment"}</span>
                                <span className="w-5 border-t border-dashed border-gray-300" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">To</p>
                                <p className="font-medium text-[#323232]">{formatValue(change.field, change.to)}</p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-[320px]">
                              {request.entity_label}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs cursor-pointer"
                                onClick={() => toggle(setExpanded, request.id)}
                              >
                                {open ? "View Less" : "View More"}
                                {open ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                              </Button>
                              {isPending ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 cursor-pointer"
                                    title="Reject"
                                    disabled={busy}
                                    onClick={() => openReject([request.id])}
                                  >
                                    <X className="w-4 h-4 text-red-600" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 cursor-pointer"
                                    title="Approve"
                                    disabled={busy}
                                    onClick={() => handleApprove(request.id)}
                                  >
                                    {busy ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4 text-green-600" />
                                    )}
                                  </Button>
                                </>
                              ) : (
                                <div className="text-xs">
                                  <ApprovalStatusBadge status={request.status} />
                                  <p className="text-gray-500 mt-1">
                                    {request.reviewed_by?.name || "—"} · {formatDateTime(request.reviewed_at)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>

                        {open && (
                          <tr className="border-b border-gray-100">
                            <td colSpan={columns} className="px-4 pb-4">
                              <div className="border border-gray-200 rounded-md overflow-hidden">
                                <div className="grid grid-cols-2 md:grid-cols-4 bg-[#F1F3F5] text-xs font-medium text-[#323232]">
                                  <div className="px-4 py-2">Applied On</div>
                                  <div className="px-4 py-2">Patient / Record</div>
                                  <div className="px-4 py-2">Other Details</div>
                                  <div className="px-4 py-2">Employee's Reason</div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 text-sm text-[#323232]">
                                  <div className="px-4 py-3">{formatDateTime(request.created_at)}</div>
                                  <div className="px-4 py-3">
                                    <p>{request.entity_label || "—"}</p>
                                    <p className="text-xs text-gray-500">{request.entity_summary}</p>
                                  </div>
                                  <div className="px-4 py-3 space-y-0.5">
                                    {others.length === 0 ? (
                                      <span className="text-gray-400">—</span>
                                    ) : (
                                      others.map((c) => (
                                        <p key={c.field} className="text-xs">
                                          <span className="text-gray-500">{c.field_label}:</span>{" "}
                                          {c.from !== c.to && !showsNewValueOnly(request, c.field) && (
                                            <>
                                              <span>{formatValue(c.field, c.from)}</span> →{" "}
                                            </>
                                          )}
                                          <span className="font-medium">{formatValue(c.field, c.to)}</span>
                                        </p>
                                      ))
                                    )}
                                  </div>
                                  <div className="px-4 py-3 whitespace-pre-wrap">
                                    {request.reason || <span className="text-gray-400">No reason given</span>}
                                  </div>
                                </div>
                                {request.review_reason && (
                                  <div className="px-4 py-3 border-t border-gray-200 text-sm">
                                    <span className="text-gray-500">Superadmin's note: </span>
                                    {request.review_reason}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3">
              <TablePagination currentPage={page} totalPages={totalPages} setCurrentPage={setPage} />
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(v) => !rejecting && !v && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-[#4B4B4B]">
              Reject {rejectTarget?.length > 1 ? `${rejectTarget.length} requests` : "request"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              The record stays as it is. The requester sees your note when they check the status.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason (optional)"
            className="text-sm"
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmReject}
              disabled={rejecting}
            >
              {rejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
