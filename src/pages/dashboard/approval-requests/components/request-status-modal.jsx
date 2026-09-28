import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardList, Loader2, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import API from "@/api";
import { unwrap } from "@/pages/dashboard/rbac/helpers";
import {
  ApprovalStatusBadge,
  ChangeLine,
  REQUEST_TYPE_LABEL,
  formatDateTime,
  formatValue,
  showsNewValueOnly,
  useCurrentUserId,
  useNeedsApproval,
} from "./approval-helpers";

/**
 * "Check request status" for one record: the latest approval request in full
 * (who asked, what would change, and the superadmin's decision), then the
 * record's earlier requests as an accordion (same look as the website FAQ) —
 * each opens in place to show its details. The requester can withdraw their pending request;
 * the superadmin can approve or reject it right here.
 */
export function RequestStatusModal({ open, onOpenChange, entityType, record, recordLabel, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  // The earlier request expanded in the accordion (one at a time).
  const [openId, setOpenId] = useState(null);

  const needsApproval = useNeedsApproval();
  const canReview = !needsApproval;
  const userId = useCurrentUserId();

  const load = useCallback(async () => {
    if (!record?._id) return;
    setLoading(true);
    try {
      const res = await API.approvalRequests.GetRecordRequests(entityType, record._id);
      if (res && !res.error) setRequests(res.requests || []);
    } finally {
      setLoading(false);
    }
  }, [entityType, record?._id]);

  useEffect(() => {
    if (open) {
      setOpenId(null);
      setRejecting(false);
      setRejectNote("");
      load();
    }
  }, [open, load]);

  const latest = requests[0];
  const older = requests.slice(1);
  const isMine = latest && String(latest.requested_by?.id) === userId;

  const act = async (fn, successMessage) => {
    setBusy(true);
    try {
      const res = unwrap(await fn());
      if (res?.request) {
        toast.success(successMessage);
        await load();
        onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-[#4B4B4B]">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            Request Status
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {recordLabel || requests[0]?.entity_label || "Approval requests raised on this record"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : !latest ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No approval requests have been raised on this record.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {REQUEST_TYPE_LABEL[latest.request_type] || "Change request"}
                </span>
                <ApprovalStatusBadge status={latest.status} />
              </div>

              <div className="space-y-1.5">
                {latest.changes.map((change) => (
                  <ChangeLine
                    key={change.field}
                    change={change}
                    newOnly={showsNewValueOnly(latest, change.field)}
                  />
                ))}
              </div>

              <RequestMeta request={latest} />

              {latest.status === "pending" && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {canReview ? (
                    rejecting ? (
                      <div className="space-y-2">
                        <Textarea
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="Reason for rejecting (optional)"
                          className="text-sm"
                          maxLength={500}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setRejecting(false)} disabled={busy}>
                            Back
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () => API.approvalRequests.RejectRequest(latest.id, { review_reason: rejectNote }),
                                "Request rejected"
                              )
                            }
                          >
                            Reject request
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRejecting(true)} disabled={busy}>
                          <X className="w-4 h-4 mr-1 text-red-600" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={busy}
                          onClick={() =>
                            act(() => API.approvalRequests.ApproveRequest(latest.id), "Request approved and applied")
                          }
                        >
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">
                        Waiting for the superadmin. Nothing changes until it is approved.
                      </p>
                      {isMine && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            act(() => API.approvalRequests.WithdrawRequest(latest.id), "Request withdrawn")
                          }
                        >
                          <Undo2 className="w-4 h-4 mr-1" /> Withdraw
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {older.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Earlier requests</p>
                <div className="max-h-64 overflow-y-auto eme-scroll space-y-2 pr-1">
                  {older.map((request) => {
                    const expanded = openId === request.id;
                    const payment = request.changes.find((c) => c.field === "paymentStatus");
                    return (
                      <div
                        key={request.id}
                        className="bg-[#FCFCFC] border border-[#EFEFEF] rounded-[10px] px-3"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenId(expanded ? null : request.id)}
                          aria-expanded={expanded}
                          className="w-full py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-[#323232] truncate">
                              {payment
                                ? `${formatValue(payment.field, payment.from)} → ${formatValue(payment.field, payment.to)}`
                                : REQUEST_TYPE_LABEL[request.request_type] || "Change request"}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {request.requested_by?.name} · {formatDateTime(request.created_at)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <ApprovalStatusBadge status={request.status} />
                          </div>
                        </button>

                        {/* Grid-rows trick: animates open/close to the content's real height. */}
                        <div
                          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="pb-3 space-y-3">
                              <div className="space-y-1.5">
                                {request.changes.map((change) => (
                                  <ChangeLine
                                    key={change.field}
                                    change={change}
                                    newOnly={showsNewValueOnly(request, change.field)}
                                  />
                                ))}
                              </div>
                              <RequestMeta request={request} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Who asked, when, why, and the superadmin's decision — shared by the latest card and the accordion. */
function RequestMeta({ request }) {
  return (
    <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
      <div>
        <p className="text-gray-400">Requested by</p>
        <p className="text-gray-800">{request.requested_by?.name || "—"}</p>
      </div>
      <div>
        <p className="text-gray-400">Requested on</p>
        <p className="text-gray-800">{formatDateTime(request.created_at)}</p>
      </div>
      {request.reason && (
        <div className="col-span-2">
          <p className="text-gray-400">Reason</p>
          <p className="text-gray-800 whitespace-pre-wrap">{request.reason}</p>
        </div>
      )}
      {request.reviewed_by && (
        <>
          <div>
            <p className="text-gray-400">
              {request.status === "approved" ? "Approved by" : "Rejected by"}
            </p>
            <p className="text-gray-800">{request.reviewed_by.name || "Superadmin"}</p>
          </div>
          <div>
            <p className="text-gray-400">Reviewed on</p>
            <p className="text-gray-800">{formatDateTime(request.reviewed_at)}</p>
          </div>
        </>
      )}
      {request.review_reason && (
        <div className="col-span-2">
          <p className="text-gray-400">Superadmin's note</p>
          <p className="text-gray-800 whitespace-pre-wrap">{request.review_reason}</p>
        </div>
      )}
    </div>
  );
}
