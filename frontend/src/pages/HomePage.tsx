import { Box, CheckCircle2, Download, Eye, FileDown, Lock, Pencil, Printer, Search, Trash2, Truck, X, ZoomIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Worker as TesseractWorker } from "tesseract.js";

import { Card } from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../lib/errors";
import { notifyInventorySync } from "../lib/inventorySync";
import { notifyOrderDelivered } from "../lib/notificationsStorage";
import { ORDER_STATUSES, type OrderStatus } from "../lib/orderStorage";
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
  trackingNumber: string;
  orderStatus: OrderStatus;
};

const WORKFLOW: OrderStatus[] = ["New", "Giving for Printing", "In Printing", "Yet to Pack", "Dispatch", "Received"];

const SHIP_FROM_LINES = [
  "MOHIB",
  "510, WESTERN PALACE,",
  "CONGRESS NAGAR,",
  "OPP. PARK",
  "NAGPUR - 440012",
  "MOB. NO. 9156321123",
];
const SHIP_FROM_TEXT = SHIP_FROM_LINES.join("\n");

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "Giving for Printing": return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";
    case "In Printing": return "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300";
    case "Yet to Pack": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300";
    case "Dispatch": return "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300";
    case "Received": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}

function getDisplayStatusBadgeClass(status: OrderDisplayStatus): string {
  switch (status) {
    case "New": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
    case "Printing": return "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300";
    case "Dispatch": return "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300";
    case "Delivered": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
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

const PDF_STYLES = `
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

  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 20px 0; }
  .detail-item { background: #f8fafc; border-radius: 12px; padding: 12px 14px; }
  .detail-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin: 0 0 4px; }
  .detail-item .value { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0; }
  .detail-item.full { grid-column: 1 / -1; }

  .section-heading { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin: 24px 0 10px; }
  .combo-row { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; font-size: 12px; }
  .combo-row .brand-name { font-weight: 700; color: #0f172a; }
  .empty-note { font-size: 12px; color: #64748b; }

  .address-block {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 24px;
    font-size: 18px;
    line-height: 1.6;
    font-weight: 600;
    color: #0f172a;
    white-space: pre-wrap;
  }

  @page { margin-top: 130px; margin-bottom: 60px; }
`;

function pdfHeaderHtml(): string {
  return `
    <div class="pdf-header">
      <div class="badge">I</div>
      <div>
        <div class="brand">INVENTRA</div>
        <div class="tagline">Inventory &amp; Parcel Tracking</div>
      </div>
    </div>
  `;
}

function pdfFooterHtml(rightText: string): string {
  return `
    <div class="pdf-footer">
      <span>INVENTRA &mdash; Inventory &amp; Parcel Tracking</span>
      <span>${rightText}</span>
    </div>
  `;
}

function pdfDocumentHtml(title: string, footerRight: string, bodyHtml: string): string {
  return `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>${PDF_STYLES}</style>
      </head>
      <body>
        ${pdfHeaderHtml()}
        ${pdfFooterHtml(footerRight)}
        ${bodyHtml}
      </body>
    </html>
  `;
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
  const [isDeliveredOpen, setIsDeliveredOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | Exclude<OrderDisplayStatus, "Delivered">>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const [detailOrder, setDetailOrder] = useState<EnquiryRecord | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [addressPreview, setAddressPreview] = useState<{ orderId: string; text: string; loading: boolean } | null>(null);
  const addressOcrWorkerRef = useRef<TesseractWorker | null>(null);
  const addressTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => {
      addressOcrWorkerRef.current?.terminate();
      addressOcrWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = addressTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [addressPreview?.text, addressPreview?.loading]);

  const [editOrder, setEditOrder] = useState<EnquiryRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    customerName: "",
    customRequirement: "",
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

  // Order History shows only active/in-progress orders; delivered orders move to their own section.
  const activeHistory = useMemo(() => history.filter((entry) => entry.status !== "Delivered"), [history]);
  const deliveredOrders = useMemo(() => history.filter((entry) => entry.status === "Delivered"), [history]);

  const filteredHistory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return activeHistory.filter((entry) => {
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
  }, [activeHistory, statusFilter, dateFilter, customRange, searchTerm, searchField]);

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

      const bodyHtml = `
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
      `;

      printWindow.document.write(
        pdfDocumentHtml("Order History", `Generated on ${generatedOn} &bull; ${orderCountLabel}`, bodyHtml)
      );
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }

    setExportMenuOpen(false);
  };

  const downloadOrderPdf = (order: EnquiryRecord) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const generatedOn = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const displayStatus = toDisplayStatus(order.orderStatus);
    const { bg, text } = getPdfStatusColors(displayStatus);
    const quantity = getOrderQuantity(order);

    const comboRows = order.combinations.length
      ? order.combinations
          .map(
            (combination) => `
              <div class="combo-row">
                <span class="brand-name">${escapeHtml(combination.brand)}</span>
                <span>S: ${combination.quantities.S} &nbsp; M: ${combination.quantities.M} &nbsp; L: ${combination.quantities.L} &nbsp; XL: ${combination.quantities.XL}</span>
              </div>
            `
          )
          .join("")
      : `<p class="empty-note">No brand/size breakdown recorded.</p>`;

    const bodyHtml = `
      <h1 class="report-title">Order Receipt</h1>
      <p class="report-subtitle">${escapeHtml(order.orderId)} &bull; Generated on ${generatedOn}</p>

      <div class="detail-grid">
        <div class="detail-item"><p class="label">Order ID</p><p class="value">${escapeHtml(order.orderId)}</p></div>
        <div class="detail-item"><p class="label">Status</p><p class="value"><span class="status-badge" style="background:${bg};color:${text};">${displayStatus}</span></p></div>
        <div class="detail-item"><p class="label">Customer Name</p><p class="value">${escapeHtml(order.customerName)}</p></div>
        <div class="detail-item"><p class="label">Assigner</p><p class="value">${escapeHtml(order.assignerName)}</p></div>
        <div class="detail-item"><p class="label">Order Date</p><p class="value">${formatShortDate(order.createdAt)}</p></div>
        <div class="detail-item"><p class="label">Delivery Date</p><p class="value">${order.deliveryDate ? formatShortDate(order.deliveryDate) : "-"}</p></div>
        <div class="detail-item"><p class="label">Tracking Number</p><p class="value">${escapeHtml(order.trackingNumber || "-")}</p></div>
        <div class="detail-item"><p class="label">Total Quantity</p><p class="value">${quantity} pcs</p></div>
        <div class="detail-item full"><p class="label">Custom Requirement</p><p class="value">${escapeHtml(order.customRequirement || "-")}</p></div>
        <div class="detail-item full"><p class="label">Note / Remarks</p><p class="value">${escapeHtml(order.notes || "-")}</p></div>
      </div>

      <p class="section-heading">Brand / Size / Quantity</p>
      ${comboRows}
    `;

    printWindow.document.write(pdfDocumentHtml(`Order ${order.orderId}`, `Generated on ${generatedOn}`, bodyHtml));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const getAddressOcrWorker = async () => {
    if (!addressOcrWorkerRef.current) {
      const { createWorker } = await import("tesseract.js");
      addressOcrWorkerRef.current = await createWorker("eng");
    }
    return addressOcrWorkerRef.current;
  };

  const openAddressPreview = async (order: EnquiryRecord) => {
    const cachedText = order.extractedAddress.trim();

    if (cachedText) {
      setAddressPreview({ orderId: order.orderId, text: cachedText, loading: false });
      return;
    }

    if (!order.shippingImage) {
      toast.error("No shipping address text or file is available for this order.");
      return;
    }

    setAddressPreview({ orderId: order.orderId, text: "", loading: true });
    try {
      const worker = await getAddressOcrWorker();
      const { data } = await worker.recognize(order.shippingImage);
      const text = data.text.trim();
      setAddressPreview({ orderId: order.orderId, text, loading: false });
      if (!text) {
        toast.error("No address text found in the image. You can type it manually.");
      }
    } catch (error) {
      console.error("[HomePage] address OCR failed", error);
      setAddressPreview({ orderId: order.orderId, text: "", loading: false });
      toast.error("Could not extract address text from the image. You can type it manually.");
    }
  };

  const closeAddressPreview = () => setAddressPreview(null);

  const printAddressPreview = () => {
    window.print();
  };

  const downloadAddressPreviewPdf = async () => {
    if (!addressPreview) return;
    const toText = addressPreview.text.trim() || "No address text available.";

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const marginX = 22;
    const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;
    const lineHeightFactor = 1.6;
    const lineHeightMm = doc.getFontSize() * lineHeightFactor * 0.3528;

    let cursorY = 28;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("TO:", marginX, cursorY);
    cursorY += lineHeightMm + 2;

    doc.setFont("helvetica", "normal");
    const toLines = doc.splitTextToSize(toText, maxWidth);
    doc.text(toLines, marginX, cursorY, { lineHeightFactor });
    cursorY += toLines.length * lineHeightMm + 14;

    doc.setFont("helvetica", "bold");
    doc.text("FROM:", marginX, cursorY);
    cursorY += lineHeightMm + 2;

    doc.setFont("helvetica", "normal");
    doc.text(SHIP_FROM_LINES, marginX, cursorY, { lineHeightFactor });

    doc.save(`address-${addressPreview.orderId}.pdf`);
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
      notifyInventorySync();
      if (nextStatus === "Received" && order.orderStatus !== "Received") {
        notifyOrderDelivered(order.orderId);
      }
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

  const saveEditOrder = async () => {
    if (!editOrder) return;

    if (!editForm.customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    if (!editForm.customRequirement.trim() && editOrder.combinations.length === 0) {
      toast.error("This order has no requirements on file — add a custom requirement.");
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
        combinations: editOrder.combinations,
        trackingNumber: editForm.trackingNumber.trim(),
        orderStatus: editForm.orderStatus,
        statusHistory,
        deliveryDate,
        notes: editOrder.notes,
        extractedAddress: editOrder.extractedAddress,
      });

      await refreshHistory();
      notifyInventorySync();
      if (statusChanged && editForm.orderStatus === "Received") {
        notifyOrderDelivered(editOrder.orderId);
      }
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

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-3.5 w-3.5 rounded-full bg-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Stock Up</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Add new stock received from distributors.</p>
              <div className="mt-4">
                <Link to="/stock-up" className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                  <Box className="h-4 w-4" /> Open Stock Up
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-3.5 w-3.5 rounded-full bg-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Enquiry</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Capture and manage customer inventory assignments.</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigate("/enquiry")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <Search className="h-4 w-4" /> Open Enquiry
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setIsSummaryOpen((open) => !open)}
            className="flex w-full items-start gap-4 text-left"
          >
            <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-blue-600" />
            <div className="w-full min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Order Summary</h2>
                <span className="text-slate-400">{isSummaryOpen ? "▲" : "▼"}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Each order's stage — click to expand and advance.</p>
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
                      <div key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{order.orderId} · {order.customerName}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{entry.product}{entry.quantity ? ` · ${entry.quantity} pcs` : ""}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(order.orderStatus)}`}>
                              {order.orderStatus}
                            </span>
                            <span className="text-slate-400">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </button>

                        {isExpanded ? (
                          <div className="space-y-1.5 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
                            {WORKFLOW.map((stage, index) => {
                              const isDone = index < workflowIdx;
                              const isCurrent = index === workflowIdx;
                              const nextStage = WORKFLOW[index + 1] as OrderStatus | undefined;
                              const histEntry = order.statusHistory.slice().reverse().find((h) => h.status === stage);

                              return (
                                <div
                                  key={stage}
                                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-all ${
                                    isDone
                                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
                                      : isCurrent
                                      ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
                                      : "border-slate-100 bg-slate-50 opacity-40 dark:border-slate-800 dark:bg-slate-900/40"
                                  }`}
                                >
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    {isDone ? (
                                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                    ) : isCurrent ? (
                                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-900" />
                                    ) : (
                                      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    )}
                                    <div className="min-w-0">
                                      <p className={`truncate text-xs font-semibold ${isDone ? "text-emerald-800 dark:text-emerald-300" : isCurrent ? "text-blue-900 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}>
                                        {stage}
                                      </p>
                                      {histEntry ? (
                                        <p className="truncate text-[10px] text-slate-400">{new Date(histEntry.updated_at).toLocaleString()}</p>
                                      ) : null}
                                    </div>
                                  </div>

                                  {isCurrent && nextStage ? (
                                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                                      {stage === "Yet to Pack" ? (
                                        <button
                                          type="button"
                                          className="rounded-lg border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"
                                          onClick={() => openAddressPreview(order)}
                                        >
                                          Download Address PDF
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        disabled={updatingOrderId === order.id}
                                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                        onClick={() => handleWorkflowAdvance(order, nextStage)}
                                      >
                                        {updatingOrderId === order.id ? "…" : "Done"}
                                      </button>
                                    </div>
                                  ) : isCurrent && !nextStage ? (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
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

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-blue-600" />
              <button
                type="button"
                onClick={() => setIsHistoryOpen((open) => !open)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left dark:border-slate-700 dark:bg-slate-900"
              >
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Order History</h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">{activeHistory.length}</span>
                  <span className="text-slate-500 dark:text-slate-400">{isHistoryOpen ? "▲" : "▼"}</span>
                </div>
              </button>
            </div>

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
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <select
                      value={searchField}
                      onChange={(event) => setSearchField(event.target.value as SearchField)}
                      className="h-11 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      <Download className="h-4 w-4" /> Export
                    </button>
                    {exportMenuOpen ? (
                      <div className="absolute right-0 z-10 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <button type="button" onClick={() => exportHistory("excel")} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800">
                          Excel
                        </button>
                        <button type="button" onClick={() => exportHistory("pdf")} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800">
                          PDF
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[0.9fr_0.9fr]">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as "All" | Exclude<OrderDisplayStatus, "Delivered">)}
                    className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="All">All</option>
                    <option value="New">New</option>
                    <option value="Printing">Printing</option>
                    <option value="Dispatch">Dispatch</option>
                  </select>

                  <select
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                    className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="thisMonth">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {dateFilter === "custom" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Start date
                      <input
                        type="date"
                        value={customRange.start}
                        onChange={(event) => setCustomRange((current) => ({ ...current, start: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      End date
                      <input
                        type="date"
                        value={customRange.end}
                        onChange={(event) => setCustomRange((current) => ({ ...current, end: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    Loading order history…
                  </div>
                ) : (
              <>
                <div className="grid gap-3">
                  {filteredHistory.length ? (
                    filteredHistory.map((entry) => (
                      <div
                        key={`${entry.orderId}-${entry.trackingNumber}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{entry.orderId}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{entry.customerName}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getDisplayStatusBadgeClass(entry.status)}`}>
                            {entry.status}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <p className="min-w-0 truncate"><span className="text-slate-400">Product: </span>{entry.product}</p>
                          <p className="min-w-0 truncate"><span className="text-slate-400">Qty: </span>{entry.quantity}</p>
                          <p className="min-w-0 truncate"><span className="text-slate-400">Date: </span>{formatShortDate(entry.date)}</p>
                          <p className="min-w-0 truncate"><span className="text-slate-400">Tracking: </span>{entry.trackingNumber}</p>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setDetailOrder(entry.raw)}
                            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditOrder(entry.raw)}
                            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteOrder(entry.raw.id)}
                            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                      No saved orders match your current filters.
                    </p>
                  )}
                </div>
              </>
                )}
              </>
            ) : null}
          </div>
        </Card>

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-3.5 w-3.5 rounded-full bg-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Track</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Open tracking instantly for parcel updates.</p>
              <div className="mt-4">
                <Link to="/track" className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                  <Truck className="h-4 w-4" /> Open Tracking
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-blue-600" />
              <button
                type="button"
                onClick={() => setIsDeliveredOpen((open) => !open)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left dark:border-slate-700 dark:bg-slate-900"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delivered Orders</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Orders marked Received move here automatically.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">{deliveredOrders.length}</span>
                  <span className="text-slate-500 dark:text-slate-400">{isDeliveredOpen ? "▲" : "▼"}</span>
                </div>
              </button>
            </div>

            {isDeliveredOpen ? (
              <div className="space-y-3">
                {deliveredOrders.length ? (
                  deliveredOrders.map((entry) => (
                    <div key={entry.raw.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{entry.orderId} · {entry.customerName}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{entry.product}{entry.quantity ? ` · ${entry.quantity} pcs` : ""}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Delivered
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <p className="min-w-0 truncate"><span className="text-slate-400">Order Date: </span>{formatShortDate(entry.date)}</p>
                        <p className="min-w-0 truncate"><span className="text-slate-400">Delivered: </span>{entry.raw.deliveryDate ? formatShortDate(entry.raw.deliveryDate) : "-"}</p>
                        <p className="col-span-2 min-w-0 truncate"><span className="text-slate-400">Tracking: </span>{entry.trackingNumber}</p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setDetailOrder(entry.raw)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadOrderPdf(entry.raw)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200"
                        >
                          <Download className="h-3.5 w-3.5" /> Download PDF
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    No delivered orders yet.
                  </p>
                )}
              </div>
            ) : null}
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
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Order Details</p>
                <h2 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-slate-100">{detailOrder.orderId}</h2>
              </div>
              <button
                type="button"
                onClick={closeDetailOrder}
                className="shrink-0 rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                aria-label="Close order details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
              <div className="min-w-0"><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Customer Name</p><p className="break-words font-semibold text-slate-900 dark:text-slate-100">{detailOrder.customerName}</p></div>
              <div className="min-w-0"><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Assigner</p><p className="break-words font-semibold text-slate-900 dark:text-slate-100">{detailOrder.assignerName}</p></div>
              <div className="min-w-0"><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Order Date</p><p className="font-semibold text-slate-900 dark:text-slate-100">{formatShortDate(detailOrder.createdAt)}</p></div>
              <div className="min-w-0"><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Status</p><p className="font-semibold text-slate-900 dark:text-slate-100">{toDisplayStatus(detailOrder.orderStatus)}</p></div>
              <div className="min-w-0 md:col-span-2"><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Tracking Number</p><p className="break-words font-semibold text-slate-900 dark:text-slate-100">{detailOrder.trackingNumber || "-"}</p></div>
              <div className="min-w-0 md:col-span-2"><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Custom Requirement</p><p className="break-words font-semibold text-slate-900 dark:text-slate-100">{detailOrder.customRequirement || "-"}</p></div>
              <div className="min-w-0 md:col-span-2"><p className="text-xs uppercase text-slate-500 dark:text-slate-400">Note / Remarks</p><p className="break-words font-semibold text-slate-900 dark:text-slate-100">{detailOrder.notes || "-"}</p></div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Brand / Size / Quantity</p>
              {detailOrder.combinations.length ? (
                <div className="mt-2 space-y-1.5">
                  {detailOrder.combinations.map((combination) => (
                    <div key={combination.id} className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{combination.brand}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        S: {combination.quantities.S} | M: {combination.quantities.M} | L: {combination.quantities.L} | XL: {combination.quantities.XL}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">-</p>
              )}
              <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Total Quantity: {getOrderQuantity(detailOrder)}</p>
            </div>

            <div className="mt-4">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Shipping Address Screenshot</p>
              {detailOrder.shippingImage ? (
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(detailOrder.shippingImage)}
                    className="block w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ZoomIn className="h-3.5 w-3.5" /> View Image
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No screenshot uploaded.</p>
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
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Edit Order</p>
                <h2 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-slate-100">{editOrder.orderId}</h2>
              </div>
              <button
                type="button"
                onClick={closeEditOrder}
                className="shrink-0 rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                aria-label="Close edit order"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Customer Name</label>
                <input
                  value={editForm.customerName}
                  onChange={(event) => updateEditField("customerName", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Custom Requirement</label>
                <input
                  value={editForm.customRequirement}
                  onChange={(event) => updateEditField("customRequirement", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Order Status</label>
                <select
                  value={editForm.orderStatus}
                  onChange={(event) => updateEditField("orderStatus", event.target.value as OrderStatus)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tracking Number</label>
                <input
                  value={editForm.trackingNumber}
                  onChange={(event) => updateEditField("trackingNumber", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditOrder}
                  className="h-11 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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

      {addressPreview ? (
        <div
          className="address-preview-no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeAddressPreview}
        >
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #address-preview-page, #address-preview-page * { visibility: visible; }
              #address-preview-page {
                position: fixed;
                inset: 0;
                margin: 0;
                box-shadow: none;
                border: none;
                border-radius: 0;
              }
              .address-preview-no-print { display: none !important; }
            }
          `}</style>
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="address-preview-no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Shipping Address</p>
                <h2 className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{addressPreview.orderId}</h2>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={printAddressPreview}
                  disabled={addressPreview.loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={downloadAddressPreviewPdf}
                  disabled={addressPreview.loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <FileDown className="h-3.5 w-3.5" /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={closeAddressPreview}
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                  aria-label="Close address preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto bg-slate-100 p-6 dark:bg-slate-950">
              <div id="address-preview-page" className="mx-auto w-full max-w-[210mm] rounded-xl bg-white p-10 shadow-sm">
                {addressPreview.loading ? (
                  <p className="text-sm text-slate-500">Extracting address text from the uploaded image…</p>
                ) : (
                  <>
                    <p className="text-sm font-bold tracking-wide text-slate-900">TO:</p>
                    <textarea
                      ref={addressTextareaRef}
                      value={addressPreview.text}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAddressPreview((prev) => (prev ? { ...prev, text: value } : prev));
                      }}
                      placeholder="No address text found. Type the address manually."
                      className="mt-1 min-h-[100px] w-full resize-none overflow-hidden border-none bg-transparent text-base leading-relaxed text-slate-900 outline-none"
                    />

                    <p className="mt-8 text-sm font-bold tracking-wide text-slate-900">FROM:</p>
                    <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-slate-900">{SHIP_FROM_TEXT}</p>
                  </>
                )}
              </div>
            </div>
          </div>
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
