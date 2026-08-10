import { Download, Eye, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "../components/shared/EmptyState";
import { Card } from "../components/ui/card";
import { getErrorMessage } from "../lib/errors";
import { INVENTORY_SYNC_EVENT } from "../lib/inventorySync";
import { fetchEnquiries, type EnquiryRecord } from "../services/enquiries";

type SearchField = "all" | "invoiceNumber" | "customerName" | "product";

function matchesInvoiceQuery(orderId: string, rawQuery: string): boolean {
  const id = orderId.trim().toLowerCase();
  const query = rawQuery.trim().toLowerCase();
  if (!query) return false;
  if (id === query) return true;

  const idDigits = id.match(/(\d+)$/)?.[1];
  const queryDigits = query.match(/(\d+)$/)?.[1];
  if (idDigits && queryDigits) {
    return parseInt(idDigits, 10) === parseInt(queryDigits, 10);
  }
  return false;
}

function getOrderQuantity(entry: EnquiryRecord) {
  return entry.combinations.reduce((total, item) => {
    return total + Object.values(item.quantities).reduce((sum, quantity) => sum + quantity, 0);
  }, 0);
}

function getOrderProduct(entry: EnquiryRecord) {
  return entry.customRequirement || entry.combinations.find((item) => item.brand)?.brand || "Custom product";
}

function formatShortDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

async function loadImageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function DeliveredOrdersPage() {
  const [orders, setOrders] = useState<EnquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [pdfPreview, setPdfPreview] = useState<{ url: string; filename: string } | null>(null);
  const [buildingPdfForId, setBuildingPdfForId] = useState<string | null>(null);
  const logoDataUrlRef = useRef<string | null>(null);
  const pdfPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrlRef.current) URL.revokeObjectURL(pdfPreviewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      setIsLoading(true);
      fetchEnquiries()
        .then((data) => {
          if (!cancelled) setOrders(data.filter((entry) => entry.orderStatus === "Received"));
        })
        .catch((error) => {
          console.error("[DeliveredOrdersPage] fetchEnquiries failed", error);
          if (!cancelled) toast.error(getErrorMessage(error, "Failed to load delivered orders."));
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    };

    load();
    window.addEventListener(INVENTORY_SYNC_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(INVENTORY_SYNC_EVENT, load);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((entry) => {
      const product = getOrderProduct(entry);
      if (searchField === "all") {
        return (
          matchesInvoiceQuery(entry.orderId, searchTerm) ||
          entry.customerName.toLowerCase().includes(query) ||
          product.toLowerCase().includes(query)
        );
      }
      if (searchField === "invoiceNumber") return matchesInvoiceQuery(entry.orderId, searchTerm);
      if (searchField === "customerName") return entry.customerName.toLowerCase().includes(query);
      return product.toLowerCase().includes(query);
    });
  }, [orders, searchTerm, searchField]);

  const buildOrderPdfDocument = async (order: EnquiryRecord) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const contentWidth = pageWidth - marginX * 2;

    // ── Branded header band ──────────────────────────────────────────
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 30, "F");

    if (!logoDataUrlRef.current) {
      try {
        logoDataUrlRef.current = await loadImageAsDataUrl("/logo.png");
      } catch (error) {
        console.error("[DeliveredOrdersPage] logo load failed", error);
      }
    }
    if (logoDataUrlRef.current) {
      doc.addImage(logoDataUrlRef.current, "PNG", marginX, 5, 20, 20);
    }

    const textStartX = logoDataUrlRef.current ? marginX + 26 : marginX;
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("INVENTRA", textStartX, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Inventory & Parcel Tracking", textStartX, 21);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DELIVERED ORDER RECEIPT", pageWidth - marginX, 14, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(order.orderId, pageWidth - marginX, 20, { align: "right" });

    let cursorY = 42;

    const sectionHeading = (label: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), marginX, cursorY);
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, cursorY + 2, pageWidth - marginX, cursorY + 2);
      cursorY += 9;
    };

    const fieldGrid = (pairs: [string, string][]) => {
      const colWidth = contentWidth / 2;
      pairs.forEach(([label, value], index) => {
        const col = index % 2;
        if (col === 0 && index > 0) cursorY += 13;
        const x = marginX + col * colWidth;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(label.toUpperCase(), x, cursorY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(value || "-", x, cursorY + 5.5);
      });
      cursorY += 16;
    };

    sectionHeading("Order Details");
    fieldGrid([
      ["Order ID", order.orderId],
      ["Order Date", formatShortDate(order.createdAt)],
      ["Assigner", order.assignerName || "-"],
      ["Status", "Delivered"],
    ]);

    sectionHeading("Customer Details");
    fieldGrid([
      ["Customer Name", order.customerName],
      ["Product", getOrderProduct(order)],
    ]);

    sectionHeading("Delivery Information");
    fieldGrid([
      ["Delivered On", formatShortDate(order.deliveryDate)],
      ["Tracking Number", order.trackingNumber || "-"],
    ]);

    const shippingAddress = order.extractedAddress.trim();
    if (shippingAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("SHIPPING ADDRESS", marginX, cursorY);
      cursorY += 5.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const addressLines = doc.splitTextToSize(shippingAddress, contentWidth);
      doc.text(addressLines, marginX, cursorY);
      cursorY += addressLines.length * 5 + 10;
    }

    if (order.combinations.length) {
      sectionHeading("Order Items");
      for (const combination of order.combinations) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(combination.brand || "-", marginX, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const sizes = `S: ${combination.quantities.S}   M: ${combination.quantities.M}   L: ${combination.quantities.L}   XL: ${combination.quantities.XL}   XXL: ${combination.quantities.XXL}`;
        doc.text(sizes, marginX, cursorY + 5);
        cursorY += 12;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Quantity: ${getOrderQuantity(order)} pcs`, marginX, cursorY);
      cursorY += 10;
    }

    // ── Footer ────────────────────────────────────────────────────────
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 16, pageWidth - marginX, pageHeight - 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("INVENTRA — Inventory & Parcel Tracking", marginX, pageHeight - 10);
    doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth - marginX, pageHeight - 10, { align: "right" });

    return doc;
  };

  const openPdfPreview = async (order: EnquiryRecord) => {
    setBuildingPdfForId(order.id);
    try {
      const doc = await buildOrderPdfDocument(order);
      const url = URL.createObjectURL(doc.output("blob"));
      if (pdfPreviewUrlRef.current) URL.revokeObjectURL(pdfPreviewUrlRef.current);
      pdfPreviewUrlRef.current = url;
      setPdfPreview({ url, filename: `${order.orderId}-delivered.pdf` });
    } catch (error) {
      console.error("[DeliveredOrdersPage] PDF preview generation failed", error);
      toast.error("Could not generate the PDF preview.");
    } finally {
      setBuildingPdfForId(null);
    }
  };

  const closePdfPreview = () => {
    if (pdfPreviewUrlRef.current) {
      URL.revokeObjectURL(pdfPreviewUrlRef.current);
      pdfPreviewUrlRef.current = null;
    }
    setPdfPreview(null);
  };

  return (
    <div className="w-full min-w-0 space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 sm:text-2xl">Delivered Orders</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isLoading ? "Loading delivered orders…" : `${filteredOrders.length} of ${orders.length} delivered order${orders.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6">
        <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center sm:gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search invoice number"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <select
            value={searchField}
            onChange={(event) => setSearchField(event.target.value as SearchField)}
            className="h-11 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 sm:w-auto dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">All Fields</option>
            <option value="invoiceNumber">Invoice / Order ID (exact)</option>
            <option value="customerName">Customer Name</option>
            <option value="product">Product</option>
          </select>
        </div>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="No delivered orders"
              description={searchTerm.trim() ? "No delivered orders match your search." : "Orders marked Received will show up here."}
            />
          ) : (
            filteredOrders.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {entry.orderId} · {entry.customerName}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {getOrderProduct(entry)} · {getOrderQuantity(entry)} pcs · Delivered {formatShortDate(entry.deliveryDate)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPdfPreview(entry)}
                    disabled={buildingPdfForId === entry.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                  >
                    <Eye className="h-3.5 w-3.5" /> {buildingPdfForId === entry.id ? "Opening…" : "View"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPdfPreview(entry)}
                    disabled={buildingPdfForId === entry.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5" /> {buildingPdfForId === entry.id ? "Opening…" : "PDF"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {pdfPreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closePdfPreview}
        >
          <div
            className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">PDF Preview</p>
                <h2 className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{pdfPreview.filename}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={pdfPreview.url}
                  download={pdfPreview.filename}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </a>
                <button
                  type="button"
                  onClick={closePdfPreview}
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                  aria-label="Close PDF preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe src={pdfPreview.url} title="Delivered order PDF preview" className="w-full flex-1 bg-slate-100 dark:bg-slate-950" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
