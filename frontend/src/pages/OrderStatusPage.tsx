import { CheckCircle2, Clock4, Lock, RefreshCcw, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { getErrorMessage } from "../lib/errors";
import { INVENTORY_SYNC_EVENT, notifyInventorySync } from "../lib/inventorySync";
import { notifyOrderDelivered } from "../lib/notificationsStorage";
import { setSelectedTrackingNumber, type OrderStatus } from "../lib/orderStorage";
import { fetchEnquiries, updateEnquiryStatus, type EnquiryRecord } from "../services/enquiries";

const statusStyles: Record<OrderStatus, string> = {
  New: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  Pending: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  "Giving for Printing": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  "In Printing": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "Yet to Pack": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  Dispatch: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  Received: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
};

const WORKFLOW: OrderStatus[] = [
  "New",
  "Giving for Printing",
  "In Printing",
  "Yet to Pack",
  "Dispatch",
  "Received",
];

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export function OrderStatusPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<EnquiryRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Desktop "Order History" view — only active/running orders are shown here; delivered
  // orders live on the separate Delivered Orders page. The underlying `orders` data is
  // never filtered out of state, only out of what gets rendered/selected.
  const activeOrders = useMemo(() => orders.filter((order) => order.orderStatus !== "Received"), [orders]);

  const refreshOrders = async () => {
    try {
      const savedOrders = await fetchEnquiries();
      setOrders(savedOrders);
      const activeSavedOrders = savedOrders.filter((order) => order.orderStatus !== "Received");
      setSelectedOrderId((current) => current ?? (activeSavedOrders.length ? activeSavedOrders[0].id : null));
      return savedOrders;
    } catch (error) {
      console.error("[OrderStatusPage] refreshOrders failed", error);
      toast.error(getErrorMessage(error, "Failed to load orders."));
      return [];
    }
  };

  useEffect(() => {
    refreshOrders();

    const handleChanged = () => refreshOrders();
    window.addEventListener(INVENTORY_SYNC_EVENT, handleChanged);
    return () => window.removeEventListener(INVENTORY_SYNC_EVENT, handleChanged);
  }, []);

  useEffect(() => {
    if (selectedOrderId && !activeOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(activeOrders.length ? activeOrders[0].id : null);
    }
  }, [activeOrders, selectedOrderId]);

  const selectedOrder = useMemo(
    () => activeOrders.find((order) => order.id === selectedOrderId) ?? null,
    [activeOrders, selectedOrderId]
  );

  // Index within the workflow (Pending maps to -1 so it falls back gracefully)
  const workflowIndex = selectedOrder ? Math.max(WORKFLOW.indexOf(selectedOrder.orderStatus), 0) : -1;

  const handleTrackOrder = () => {
    if (!selectedOrder?.trackingNumber) {
      toast.error("There is no tracking number saved for this order.");
      return;
    }

    setSelectedTrackingNumber(selectedOrder.trackingNumber);
    navigate("/track");
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;

    const currentIndex = WORKFLOW.indexOf(selectedOrder.orderStatus);
    const nextIndex = WORKFLOW.indexOf(newStatus);

    if (nextIndex <= currentIndex) {
      toast.error("Status can only move forward through the flow.");
      return;
    }

    const nextHistory = [
      ...selectedOrder.statusHistory,
      { status: newStatus, updated_at: new Date().toISOString() },
    ];

    const deliveryDate = newStatus === "Received" ? new Date().toISOString().slice(0, 10) : selectedOrder.deliveryDate;

    try {
      const updatedOrder = await updateEnquiryStatus(selectedOrder.id, {
        orderStatus: newStatus,
        statusHistory: nextHistory,
        deliveryDate,
      });

      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      notifyInventorySync();
      toast.success("Order status saved.");

      if (newStatus === "Received") {
        notifyOrderDelivered(updatedOrder.orderId);
      }
    } catch (error) {
      console.error("[OrderStatusPage] handleStatusChange failed", error);
      toast.error(getErrorMessage(error, "Failed to update order status."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Order Status</h1>
          <p className="text-sm text-slate-500">Track order progress, update status, and connect saved tracking numbers.</p>
        </div>
        <Button variant="outline" onClick={() => refreshOrders()}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Orders
        </Button>
      </div>

      <div className="grid gap-4">
        <Card className="space-y-3 rounded-3xl border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Orders</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Orders</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              {activeOrders.length} orders
            </span>
          </div>

          <div className="space-y-3">
            {activeOrders.length ? (
              activeOrders.map((order) => {
                const isActive = order.id === selectedOrderId;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full rounded-3xl border p-3 text-left transition ${
                      isActive
                        ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/60"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{order.customerName || order.orderId}</p>
                        <p className="text-xs text-slate-500">{order.orderId}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[order.orderStatus]}`}>
                        {order.orderStatus}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{order.trackingNumber || "No tracking number"}</p>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">
                {orders.length
                  ? "No active orders — everything saved has been delivered."
                  : "No saved enquiries yet. Create an enquiry to manage order status."}
              </p>
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {selectedOrder ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Order Details</p>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">{selectedOrder.customerName || selectedOrder.orderId}</h2>
                </div>
                <div className="space-y-2 text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Assigned person</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedOrder.assignerName}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Order ID</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{selectedOrder.orderId}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Tracking Number</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{selectedOrder.trackingNumber || "-"}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Current Status</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{selectedOrder.orderStatus}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Delivery Date</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatDate(selectedOrder.deliveryDate)}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Order Workflow</p>
                {WORKFLOW.map((stage, index) => {
                  const isDone = index < workflowIndex;
                  const isCurrent = index === workflowIndex;
                  const historyEntry = selectedOrder.statusHistory.slice().reverse().find((h) => h.status === stage);
                  const nextStage = WORKFLOW[index + 1] as OrderStatus | undefined;

                  return (
                    <div
                      key={stage}
                      className={`rounded-2xl border p-3 transition-all ${
                        isDone
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                          : isCurrent
                          ? "border-blue-300 bg-blue-50 shadow-sm dark:border-blue-700 dark:bg-blue-950/40"
                          : "border-slate-200 bg-white opacity-40 dark:border-slate-700 dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                          ) : isCurrent ? (
                            <div className="h-5 w-5 shrink-0 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-900" />
                          ) : (
                            <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <div>
                            <p className={`text-sm font-semibold ${
                              isDone ? "text-emerald-800 dark:text-emerald-300" :
                              isCurrent ? "text-blue-900 dark:text-blue-100" :
                              "text-slate-500"
                            }`}>{stage}</p>
                            {historyEntry ? (
                              <p className="mt-0.5 text-xs text-slate-400">{new Date(historyEntry.updated_at).toLocaleString()}</p>
                            ) : null}
                          </div>
                        </div>

                        {isCurrent && nextStage ? (
                          <Button
                            type="button"
                            className="h-8 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
                            onClick={() => handleStatusChange(nextStage)}
                          >
                            Done
                          </Button>
                        ) : isCurrent && !nextStage ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Completed!
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" onClick={handleTrackOrder} className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
                  <Truck className="mr-2 h-4 w-4" /> Open Tracking
                </Button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <Clock4 className="h-4 w-4" /> <span>Status History</span>
                </div>
                <div className="mt-3 space-y-2">
                  {selectedOrder.statusHistory.slice(-5).reverse().map((entry) => (
                    <div key={entry.updated_at} className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-900">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.status}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(entry.updated_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {!selectedOrder.statusHistory.length ? <p className="text-sm text-slate-500">No status changes recorded yet.</p> : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Select an order to view details.</p>
              <p className="mt-2 text-sm text-slate-500">Saved order records appear here once enquiries are created.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
