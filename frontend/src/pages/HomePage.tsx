import { Box, CheckCircle2, CircleHelp, Download, Eye, Lock, Minus, Pencil, Plus, Search, Trash2, Truck, X, ZoomIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card } from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../lib/errors";
import {
  ORDER_STATUSES,
  createEmptyCombination,
  type BrandName,
  type OrderStatus,
  type RequirementCombination,
  type SizeName,
} from "../lib/orderStorage";
import { fetchEnquiries, hideEnquiry, updateEnquiry, updateEnquiryStatus, type EnquiryRecord } from "../services/enquiries";

type OrderDisplayStatus = "New" | "Printing" | "Dispatch" | "Delivered";
type DateFilter = "all" | "today" | "thisMonth" | "custom";
type SearchField = "all" | "orderId" | "customerName" | "product";
type OrderHistoryEntry = {
  orderId: string;
  customerName: string;
  product: string;
  quantity: number;
  date: string;
  status: OrderDisplayStatus;
  orderStatus: OrderStatus;
  trackingNumber: string;
  raw: EnquiryRecord;
};
type EditFormState = {
  customerName: string;
  customRequirement: string;
  combinations: RequirementCombination[];
  trackingNumber: string;
  orderStatus: OrderStatus;
};

const WORKFLOW: OrderStatus[] = ["New", "Giving for Printing", "In Printing", "Yet to Pack", "Dispatch", "Received"];
const brandOptions: BrandName[] = ["Plain T-Shirts", "Sunkool", "Ceramic Shield", "R S", "Puma"];
const sizeOptions: SizeName[] = ["S", "M", "L", "XL"];

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "Giving for Printing": return "bg-blue-100 text-blue-800";
    case "In Printing": return "bg-orange-100 text-orange-800";
    case "Yet to Pack": return "bg-yellow-100 text-yellow-800";
    case "Dispatch": return "bg-teal-100 text-teal-800";
    case "Received": return "bg-emerald-100 text-emerald-800";
    default: return "bg-slate-100 text-slate-700";
  }
}

function getDisplayStatusBadgeClass(status: OrderDisplayStatus): string {
  switch (status) {
    case "New": return "bg-slate-100 text-slate-700";
    case "Printing": return "bg-orange-100 text-orange-800";
    case "Dispatch": return "bg-teal-100 text-teal-800";
    case "Delivered": return "bg-emerald-100 text-emerald-800";
    default: return "bg-slate-100 text-slate-700";
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPdfStatusColors(status: OrderDisplayStatus): { bg: string; text: string } {
  switch (status) {
    case "Printing": return { bg: "#ffedd5", text: "#9a3412" };
    case "Dispatch": return { bg: "#ccfbf1", text: "#115e59" };
    case "Delivered": return { bg: "#d1fae5", text: "#065f46" };
    default: return { bg: "#e2e8f0", text: "#334155" };
  }
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDisplayStatus(status: OrderStatus): OrderDisplayStatus {
  switch (status) {
    case "New":
    case "Pending":
      return "New";
    case "Giving for Printing":
    case "In Printing":
      return "Printing";
    case "Yet to Pack":
    case "Dispatch":
      return "Dispatch";
    case "Received":
      return "Delivered";
    default:
      return "New";
  }
}

function getOrderQuantity(entry: EnquiryRecord) {
  return entry.combinations.reduce((total, item) => {
    return total + Object.values(item.quantities).reduce((sum, quantity) => sum + quantity, 0);
  }, 0);
}

async function loadOrderHistory(): Promise<OrderHistoryEntry[]> {
  const records = await fetchEnquiries();

  return records
    .map((saved) => {
      const product = saved.customRequirement || saved.combinations.find((item) => item.brand)?.brand || "Custom product";

      return {
        orderId: saved.orderId,
        customerName: saved.customerName || "-",
        product,
        quantity: getOrderQuantity(saved),
        date: saved.createdAt || new Date().toISOString(),
        status: toDisplayStatus(saved.orderStatus),
        orderStatus: saved.orderStatus,
        trackingNumber: saved.trackingNumber || "-",
        raw: saved,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function matchesDateFilter(dateValue: string, filter: DateFilter, customRange: { start: string; end: string }) {
  const entryDate = new Date(dateValue);
  const today = new Date();

  if (filter === "all") return true;
  if (filter === "today") return entryDate.toDateString() === today.toDateString();
  if (filter === "thisMonth") {
    return entryDate.getMonth() === today.getMonth() && entryDate.getFullYear() === today.getFullYear();
  }
  if (filter === "custom") {
    const start = customRange.start ? new Date(`${customRange.start}T00:00:00`) : null;
    const end = customRange.end ? new Date(`${customRange.end}T23:59:59`) : null;
    if (start && entryDate < start) return false;
    if (end && entryDate > end) return false;
    return true;
  }

  return true;
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | OrderDisplayStatus>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const [detailOrder, setDetailOrder] = useState<EnquiryRecord | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [editOrder, setEditOrder] = useState<EnquiryRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    customerName: "",
    customRequirement: "",
    combinations: [],
    trackingNumber: "",
    orderStatus: "New",
  });
  const [isEditSaving, setIsEditSaving] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const syncHistory = () => {
      setIsHistoryLoading(true);
      loadOrderHistory()
        .then((data) => {
          if (!cancelled) {
            setHistory(data);
            setHistoryError(null);
          }
        })
        .catch((error) => {
          console.error("[HomePage] loadOrderHistory failed", error);
          if (!cancelled) {
            const message = getErrorMessage(error, "Failed to load order history.");
            setHistoryError(message);
            toast.error(message);
          }
        })
        .finally(() => {
          if (!cancelled) setIsHistoryLoading(false);
        });
    };

    syncHistory();
    window.addEventListener("inventra:inventory-sync", syncHistory);

    return () => {
      cancelled = true;
      window.removeEventListener("inventra:inventory-sync", syncHistory);
    };
  }, []);

  const refreshHistory = async () => {
    try {
      const updated = await loadOrderHistory();
      setHistory(updated);
      setHistoryError(null);
    } catch (error) {
      setHistoryError(getErrorMessage(error, "Failed to load order history."));
      throw error;
    }
  };

  const handleRetryHistory = () => {
    setIsHistoryLoading(true);
    refreshHistory()
      .catch((error) => {
        toast.error(getErrorMessage(error, "Failed to load order history."));
      })
      .finally(() => setIsHistoryLoading(false));
  };

  const filteredHistory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return history.filter((entry) => {
      const matchesStatus = statusFilter === "All" || entry.status === statusFilter;
      const matchesSearch =
        !query ||
        (searchField === "all"
          ? entry.orderId.toLowerCase().includes(query) ||
            entry.customerName.toLowerCase().includes(query) ||
            entry.product.toLowerCase().includes(query)
          : searchField === "orderId"
          ? entry.orderId.toLowerCase().includes(query)
          : searchField === "customerName"
          ? entry.customerName.toLowerCase().includes(query)
          : entry.product.toLowerCase().includes(query));
      const matchesDate = matchesDateFilter(entry.date, dateFilter, customRange);
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [history, statusFilter, dateFilter, customRange, searchTerm, searchField]);

  const exportHistory = (format: "excel" | "pdf") => {
    if (format === "excel") {
      const header = ["Order ID", "Customer Name", "Product", "Quantity", "Order Date", "Status", "Tracking Number"];
      const rows = filteredHistory.map((entry) => [
        entry.orderId,
        entry.customerName,
        entry.product,
        String(entry.quantity),
        formatShortDate(entry.date),
        entry.status,
        entry.trackingNumber,
      ]);

      const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "order-history.csv";
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) return;

      const generatedOn = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const orderCountLabel = `${filteredHistory.length} order${filteredHistory.length === 1 ? "" : "s"}`;

      const rows = filteredHistory
        .map((entry) => {
          const { bg, text } = getPdfStatusColors(entry.status);
          return `
            <tr>
              <td class="order-id">${escapeHtml(entry.orderId)}</td>
              <td>${escapeHtml(entry.customerName)}</td>
              <td>${escapeHtml(entry.product)}</td>
              <td>${entry.quantity}</td>
              <td>${formatShortDate(entry.date)}</td>
              <td><span class="status-badge" style="background:${bg};color:${text};">${entry.status}</span></td>
              <td>${escapeHtml(entry.trackingNumber)}</td>
            </tr>
          `;
        })
        .join("");

      printWindow.document.write(`
        <html>
          <head>
            <title>Order History</title>
            <style>
              * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 116px 28px 64px; color: #0f172a; background: #ffffff; }

              .pdf-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 18px 28px;
                background: linear-gradient(135deg, #2563eb, #06b6d4);
              }
              .pdf-header .badge {
                width: 42px;
                height: 42px;
                flex-shrink: 0;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.45);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 20px;
                color: #ffffff;
              }
              .pdf-header .brand { font-weight: 800; font-size: 19px; letter-spacing: 0.03em; color: #ffffff; }
              .pdf-header .tagline { font-size: 11px; color: rgba(255, 255, 255, 0.85); margin-top: 1px; }

              .pdf-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-between;
                padding: 10px 28px;
                border-top: 1px solid #e2e8f0;
                font-size: 10px;
                color: #64748b;
                background: #ffffff;
              }

              .report-title { font-size: 21px; margin: 0 0 4px; color: #0f172a; }
              .report-subtitle { font-size: 12px; color: #64748b; margin: 0 0 20px; }

              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              thead th {
                background: #1d4ed8;
                color: #ffffff;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                font-size: 10px;
                padding: 10px 8px;
                text-align: left;
              }
              tbody td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; }
              tbody tr:nth-child(even) { background: #f8fafc; }
              .order-id { font-weight: 700; color: #1d4ed8; }
              .status-badge {
                display: inline-block;
                padding: 3px 10px;
                border-radius: 999px;
                font-size: 10px;
                font-weight: 700;
              }

              @page { margin-top: 130px; margin-bottom: 60px; }
            </style>
          </head>
          <body>
            <div class="pdf-header">
              <div class="badge">I</div>
              <div>
                <div class="brand">INVENTRA</div>
                <div class="tagline">Inventory &amp; Parcel Tracking</div>
              </div>
            </div>

            <div class="pdf-footer">
              <span>INVENTRA &mdash; Inventory &amp; Parcel Tracking</span>
              <span>Generated on ${generatedOn} &bull; ${orderCountLabel}</span>
            </div>

            <h1 class="report-title">Order History Report</h1>
            <p class="report-subtitle">Generated on ${generatedOn} &bull; ${orderCountLabel}</p>

            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer Name</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Order Date</th>
                  <th>Status</th>
                  <th>Tracking Number</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }

    setExportMenuOpen(false);
  };

  const handleWorkflowAdvance = async (order: EnquiryRecord, nextStatus: OrderStatus) => {
    setUpdatingOrderId(order.id);
    try {
      const nextHistory = [
        ...order.statusHistory,
        { status: nextStatus, updated_at: new Date().toISOString() },
      ];
      const deliveryDate = nextStatus === "Received" ? new Date().toISOString().slice(0, 10) : order.deliveryDate;
      await updateEnquiryStatus(order.id, { orderStatus: nextStatus, statusHistory: nextHistory, deliveryDate });
      await refreshHistory();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update status."));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const closeDetailOrder = () => {
    setDetailOrder(null);
    setPreviewImage(null);
  };

  const openEditOrder = (order: EnquiryRecord) => {
    setEditOrder(order);
    setEditForm({
      customerName: order.customerName,
      customRequirement: order.customRequirement,
      combinations: order.combinations.length
        ? order.combinations.map((item) => ({ ...item, quantities: { ...item.quantities } }))
        : [createEmptyCombination()],
      trackingNumber: order.trackingNumber,
      orderStatus: order.orderStatus,
    });
  };

  const closeEditOrder = () => {
    setEditOrder(null);
  };

  const updateEditField = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setEditForm((current) => ({ ...current, [key]: value }));
  };

  const updateEditCombination = (id: string, patch: Partial<RequirementCombination>) => {
    setEditForm((current) => ({
      ...current,
      combinations: current.combinations.map((item) => {
        if (item.id !== id) return item;
        const nextItem = { ...item, ...patch };
        if (patch.brand !== undefined) {
          nextItem.quantities = { S: 0, M: 0, L: 0, XL: 0 };
        }
        return nextItem;
      }),
    }));
  };

  const setEditQuantity = (id: string, size: SizeName, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, "");
    const nextValue = digitsOnly === "" ? 0 : Math.max(0, parseInt(digitsOnly, 10));
    setEditForm((current) => ({
      ...current,
      combinations: current.combinations.map((item) =>
        item.id === id ? { ...item, quantities: { ...item.quantities, [size]: nextValue } } : item
      ),
    }));
  };

  const adjustEditQuantity = (id: string, size: SizeName, delta: number) => {
    setEditForm((current) => ({
      ...current,
      combinations: current.combinations.map((item) =>
        item.id === id
          ? { ...item, quantities: { ...item.quantities, [size]: Math.max(0, item.quantities[size] + delta) } }
          : item
      ),
    }));
  };

  const addEditCombination = () => {
    setEditForm((current) => ({ ...current, combinations: [...current.combinations, createEmptyCombination()] }));
  };

  const removeEditCombination = (id: string) => {
    setEditForm((current) => {
      const next = current.combinations.filter((item) => item.id !== id);
      return { ...current, combinations: next.length ? next : [createEmptyCombination()] };
    });
  };

  const saveEditOrder = async () => {
    if (!editOrder) return;

    if (!editForm.customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    const validCombinations = editForm.combinations.filter(
      (item) => item.brand && sizeOptions.some((size) => item.quantities[size] > 0)
    );
    if (!editForm.customRequirement.trim() && validCombinations.length === 0) {
      toast.error("Add a custom requirement or at least one brand-size quantity combination.");
      return;
    }

    setIsEditSaving(true);
    try {
      const statusChanged = editForm.orderStatus !== editOrder.orderStatus;
      const statusHistory = statusChanged
        ? [...editOrder.statusHistory, { status: editForm.orderStatus, updated_at: new Date().toISOString() }]
        : editOrder.statusHistory;
      const deliveryDate =
        editForm.orderStatus === "Received" ? new Date().toISOString().slice(0, 10) : editOrder.deliveryDate;

      await updateEnquiry(editOrder.id, {
        customerName: editForm.customerName.trim(),
        customRequirement: editForm.customRequirement.trim(),
        combinations: validCombinations,
        trackingNumber: editForm.trackingNumber.trim(),
        orderStatus: editForm.orderStatus,
        statusHistory,
        deliveryDate,
        notes: editOrder.notes,
      });

      await refreshHistory();
      toast.success("Order updated.");
      closeEditOrder();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update order."));
    } finally {
      setIsEditSaving(false);
    }
  };

  const requestDeleteOrder = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;

    setIsDeleting(true);
    try {
      await hideEnquiry(id);
      setHistory((current) => current.filter((entry) => entry.raw.id !== id));
      toast.success("Order deleted.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete order."));
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const cancelDeleteOrder = () => {
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-cyan-500 p-5 text-white shadow-lg shadow-blue-200/70">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">Inventra</p>
        <h1 className="mt-1 text-2xl font-extrabold">Welcome, {user?.first_name || user?.username}</h1>
        <p className="mt-1 text-sm text-blue-50">Maintain T-shirt inventory, stock updates, and parcel tracking from one place.</p>
      </section>

      <section className="relative space-y-6">
        <div className="pointer-events-none absolute inset-y-0 left-6 w-px bg-slate-200/70" />

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-3.5 w-3.5 rounded-full bg-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Enquiry</h2>
              <p className="mt-2 text-sm text-slate-500">Capture and manage customer inventory assignments.</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigate("/enquiry")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                >
                  <Search className="h-4 w-4" /> Open Enquiry
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-3.5 w-3.5 rounded-full bg-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Stock Up</h2>
              <p className="mt-2 text-sm text-slate-500">Add new stock received from distributors.</p>
              <div className="mt-4">
                <Link to="/stock-up" className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200">
                  <Box className="h-4 w-4" /> Open Stock Up
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setIsSummaryOpen((open) => !open)}
            className="flex w-full items-start gap-4 text-left"
          >
            <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-blue-600" />
            <div className="w-full min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
                <span className="text-slate-400">{isSummaryOpen ? "▲" : "▼"}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Each order's stage — click to expand and advance.</p>
            </div>
          </button>

          {isSummaryOpen ? (
            <div className="mt-4 space-y-2 pl-[26px]">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">No orders yet. Create an enquiry to get started.</p>
              ) : (
                history.map((entry) => {
                    const order = entry.raw;
                    const workflowIdx = Math.max(WORKFLOW.indexOf(order.orderStatus as OrderStatus), 0);
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <div key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{order.orderId} · {order.customerName}</p>
                            <p className="truncate text-xs text-slate-500">{entry.product}{entry.quantity ? ` · ${entry.quantity} pcs` : ""}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(order.orderStatus)}`}>
                              {order.orderStatus}
                            </span>
                            <span className="text-slate-400">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </button>

                        {isExpanded ? (
                          <div className="space-y-1.5 border-t border-slate-100 px-4 pb-4 pt-3">
                            {WORKFLOW.map((stage, index) => {
                              const isDone = index < workflowIdx;
                              const isCurrent = index === workflowIdx;
                              const nextStage = WORKFLOW[index + 1] as OrderStatus | undefined;
                              const histEntry = order.statusHistory.slice().reverse().find((h) => h.status === stage);

                              return (
                                <div
                                  key={stage}
                                  className={`flex items-center justify-between rounded-xl border px-3 py-2 transition-all ${
                                    isDone
                                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
                                      : isCurrent
                                      ? "border-blue-300 bg-blue-50"
                                      : "border-slate-100 bg-slate-50 opacity-40"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    {isDone ? (
                                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                    ) : isCurrent ? (
                                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-blue-500 bg-white" />
                                    ) : (
                                      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    )}
                                    <div>
                                      <p className={`text-xs font-semibold ${isDone ? "text-emerald-800" : isCurrent ? "text-blue-900" : "text-slate-500"}`}>
                                        {stage}
                                      </p>
                                      {histEntry ? (
                                        <p className="text-[10px] text-slate-400">{new Date(histEntry.updated_at).toLocaleString()}</p>
                                      ) : null}
                                    </div>
                                  </div>

                                  {isCurrent && nextStage ? (
                                    <button
                                      type="button"
                                      disabled={updatingOrderId === order.id}
                                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                      onClick={() => handleWorkflowAdvance(order, nextStage)}
                                    >
                                      {updatingOrderId === order.id ? "…" : "Done"}
                                    </button>
                                  ) : isCurrent && !nextStage ? (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                      Completed!
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                })
              )}
            </div>
          ) : null}
        </Card>

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setIsHistoryOpen((open) => !open)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left"
            >
              <div>
                <h2 className="text-lg font-bold text-slate-900">Order History</h2>
                <p className="mt-1 text-sm text-slate-500">Real saved orders only.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">{history.length}</span>
                <span className="text-slate-500">{isHistoryOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isHistoryOpen ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center sm:gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search orders"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-400"
                      />
                    </div>
                    <select
                      value={searchField}
                      onChange={(event) => setSearchField(event.target.value as SearchField)}
                      className="h-11 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 sm:w-auto"
                    >
                      <option value="all">All Fields</option>
                      <option value="orderId">Order ID</option>
                      <option value="customerName">Customer Name</option>
                      <option value="product">Product</option>
                    </select>
                  </div>

                  <div className="relative self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setExportMenuOpen((open) => !open)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                    >
                      <Download className="h-4 w-4" /> Export
                    </button>
                    {exportMenuOpen ? (
                      <div className="absolute right-0 z-10 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                        <button type="button" onClick={() => exportHistory("excel")} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100">
                          Excel
                        </button>
                        <button type="button" onClick={() => exportHistory("pdf")} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100">
                          PDF
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[0.9fr_0.9fr]">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as "All" | OrderDisplayStatus)}
                    className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                  >
                    <option value="All">All</option>
                    <option value="New">New</option>
                    <option value="Printing">Printing</option>
                    <option value="Dispatch">Dispatch</option>
                    <option value="Delivered">Delivered</option>
                  </select>

                  <select
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                    className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="thisMonth">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {dateFilter === "custom" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                      Start date
                      <input
                        type="date"
                        value={customRange.start}
                        onChange={(event) => setCustomRange((current) => ({ ...current, start: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                      End date
                      <input
                        type="date"
                        value={customRange.end}
                        onChange={(event) => setCustomRange((current) => ({ ...current, end: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                      />
                    </label>
                  </div>
                ) : null}

                {historyError ? (
                  <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    <p>Couldn't load order history: {historyError}</p>
                    <button
                      type="button"
                      onClick={handleRetryHistory}
                      className="shrink-0 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950"
                    >
                      Retry
                    </button>
                  </div>
                ) : isHistoryLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Loading order history…
                  </div>
                ) : (
              <>
                {/* Mobile card layout */}
                <div className="grid gap-3 md:hidden">
                  {filteredHistory.length ? (
                    filteredHistory.map((entry) => (
                      <div
                        key={`${entry.orderId}-${entry.trackingNumber}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{entry.orderId}</p>
                            <p className="truncate text-xs text-slate-500">{entry.customerName}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getDisplayStatusBadgeClass(entry.status)}`}>
                            {entry.status}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
                          <p className="truncate"><span className="text-slate-400">Product: </span>{entry.product}</p>
                          <p><span className="text-slate-400">Qty: </span>{entry.quantity}</p>
                          <p><span className="text-slate-400">Date: </span>{formatShortDate(entry.date)}</p>
                          <p className="truncate"><span className="text-slate-400">Tracking: </span>{entry.trackingNumber}</p>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => setDetailOrder(entry.raw)}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditOrder(entry.raw)}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteOrder(entry.raw.id)}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                      No saved orders match your current filters.
                    </p>
                  )}
                </div>

                {/* Desktop table layout */}
                <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-100 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Order ID</th>
                          <th className="px-4 py-3">Customer Name</th>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Quantity</th>
                          <th className="px-4 py-3">Order Date</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Tracking Number</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.length ? (
                          filteredHistory.map((entry) => (
                            <tr
                              key={`${entry.orderId}-${entry.trackingNumber}`}
                              className="border-t border-slate-200 bg-white transition hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 font-semibold text-slate-900">{entry.orderId}</td>
                              <td className="px-4 py-3">{entry.customerName}</td>
                              <td className="px-4 py-3">{entry.product}</td>
                              <td className="px-4 py-3">{entry.quantity}</td>
                              <td className="px-4 py-3">{formatShortDate(entry.date)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getDisplayStatusBadgeClass(entry.status)}`}>
                                  {entry.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">{entry.trackingNumber}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setDetailOrder(entry.raw)}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
                                    aria-label="View order"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditOrder(entry.raw)}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
                                    aria-label="Edit order"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteOrder(entry.raw.id)}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-rose-300 hover:text-rose-600"
                                    aria-label="Delete order"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                              No saved orders match your current filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
                )}
              </>
            ) : null}
          </div>
        </Card>

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-3.5 w-3.5 rounded-full bg-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Track</h2>
              <p className="mt-2 text-sm text-slate-500">Open tracking instantly for parcel updates.</p>
              <div className="mt-4">
                <Link to="/track" className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200">
                  <Truck className="h-4 w-4" /> Open Tracking
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-3.5 w-3.5 rounded-full bg-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">More Info</h2>
              <p className="mt-2 text-sm text-slate-500">View dashboard stats, profile, settings, and more.</p>
              <div className="mt-4">
                <Link to="/more" className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200">
                  <CircleHelp className="h-4 w-4" /> Open More Info
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {detailOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeDetailOrder}
        >
          <Card
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Order Details</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{detailOrder.orderId}</h2>
              </div>
              <button
                type="button"
                onClick={closeDetailOrder}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300"
                aria-label="Close order details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div><p className="text-xs uppercase text-slate-500">Customer Name</p><p className="font-semibold text-slate-900">{detailOrder.customerName}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Assigner</p><p className="font-semibold text-slate-900">{detailOrder.assignerName}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Order Date</p><p className="font-semibold text-slate-900">{formatShortDate(detailOrder.createdAt)}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Status</p><p className="font-semibold text-slate-900">{toDisplayStatus(detailOrder.orderStatus)}</p></div>
              <div className="md:col-span-2"><p className="text-xs uppercase text-slate-500">Tracking Number</p><p className="font-semibold text-slate-900">{detailOrder.trackingNumber || "-"}</p></div>
              <div className="md:col-span-2"><p className="text-xs uppercase text-slate-500">Custom Requirement</p><p className="font-semibold text-slate-900">{detailOrder.customRequirement || "-"}</p></div>
              <div className="md:col-span-2"><p className="text-xs uppercase text-slate-500">Note / Remarks</p><p className="font-semibold text-slate-900">{detailOrder.notes || "-"}</p></div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-500">Brand / Size / Quantity</p>
              {detailOrder.combinations.length ? (
                <div className="mt-2 space-y-1.5">
                  {detailOrder.combinations.map((combination) => (
                    <div key={combination.id} className="rounded-xl bg-white px-3 py-2">
                      <p className="font-semibold text-slate-900">{combination.brand}</p>
                      <p className="text-xs text-slate-600">
                        S: {combination.quantities.S} | M: {combination.quantities.M} | L: {combination.quantities.L} | XL: {combination.quantities.XL}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 font-semibold text-slate-900">-</p>
              )}
              <p className="mt-2 text-xs font-semibold text-slate-600">Total Quantity: {getOrderQuantity(detailOrder)}</p>
            </div>

            <div className="mt-4">
              <p className="text-xs uppercase text-slate-500">Shipping Address Screenshot</p>
              {detailOrder.shippingImage ? (
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(detailOrder.shippingImage)}
                    className="block w-full overflow-hidden rounded-2xl border border-slate-200"
                    aria-label="Open shipping screenshot preview"
                  >
                    <img
                      src={detailOrder.shippingImage}
                      alt="Shipping screenshot thumbnail"
                      className="h-40 w-full object-cover transition hover:opacity-90"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(detailOrder.shippingImage)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    <ZoomIn className="h-3.5 w-3.5" /> View Image
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No screenshot uploaded.</p>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {editOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeEditOrder}
        >
          <Card
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Edit Order</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{editOrder.orderId}</h2>
              </div>
              <button
                type="button"
                onClick={closeEditOrder}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300"
                aria-label="Close edit order"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Name</label>
                <input
                  value={editForm.customerName}
                  onChange={(event) => updateEditField("customerName", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Custom Requirement</label>
                <input
                  value={editForm.customRequirement}
                  onChange={(event) => updateEditField("customRequirement", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Order Status</label>
                <select
                  value={editForm.orderStatus}
                  onChange={(event) => updateEditField("orderStatus", event.target.value as OrderStatus)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking Number</label>
                <input
                  value={editForm.trackingNumber}
                  onChange={(event) => updateEditField("trackingNumber", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300"
                />
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements</label>

                {editForm.combinations.map((item) => {
                  const showSizes = Boolean(item.brand);
                  return (
                    <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.brand}
                          onChange={(event) => updateEditCombination(item.id, { brand: event.target.value as BrandName })}
                          className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300"
                        >
                          <option value="">Select brand</option>
                          {brandOptions.map((brand) => (
                            <option key={brand} value={brand}>{brand}</option>
                          ))}
                        </select>
                        {editForm.combinations.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeEditCombination(item.id)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                            aria-label="Remove requirement"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      {showSizes ? (
                        <div className="mt-3 space-y-2">
                          {sizeOptions.map((size) => (
                            <div key={size} className="flex items-center justify-between rounded-xl bg-blue-50/70 px-3 py-2">
                              <p className="text-sm font-semibold text-slate-700">{size} PCS</p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => adjustEditQuantity(item.id, size, -1)}
                                  className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 hover:border-blue-300"
                                  aria-label={`Decrease ${size} quantity`}
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={item.quantities[size]}
                                  onChange={(event) => setEditQuantity(item.id, size, event.target.value)}
                                  onFocus={(event) => event.target.select()}
                                  aria-label={`${size} quantity`}
                                  className="h-8 w-14 shrink-0 rounded-lg border border-slate-300 bg-white text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-400"
                                />
                                <button
                                  type="button"
                                  onClick={() => adjustEditQuantity(item.id, size, 1)}
                                  className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 hover:border-blue-300"
                                  aria-label={`Increase ${size} quantity`}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addEditCombination}
                  className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" /> Add Brand
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditOrder}
                  className="h-11 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isEditSaving}
                  onClick={saveEditOrder}
                  className="h-11 rounded-2xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {isEditSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {previewImage ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewImage}
            alt="Shipping screenshot full preview"
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete this order?"
        description="This will remove the order from Order History. It stays saved in the database."
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={confirmDeleteOrder}
        onCancel={cancelDeleteOrder}
      />
    </div>
  );
}
