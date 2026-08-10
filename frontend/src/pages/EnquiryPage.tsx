import { ChevronDown, Copy, FileDown, Minus, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Worker as TesseractWorker } from "tesseract.js";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useIsDesktopViewport } from "../hooks/useIsDesktopViewport";
import { getErrorMessage } from "../lib/errors";
import { INVENTORY_SYNC_EVENT, notifyInventorySync } from "../lib/inventorySync";
import { createEmptyCombination, type OrderStatus, type RequirementCombination } from "../lib/orderStorage";
import { createEnquiry, fetchEnquiries, type EnquiryRecord } from "../services/enquiries";
import { deductStockForEnquiry, fetchBrands, fetchInventoryByBrand, type BrandSizeStock } from "../services/inventory";

type BrandName = "Sunkool" | "Ceramic Shield" | "R S" | "Puma" | "Plain T-Shirts";
type SizeName = "S" | "M" | "L" | "XL" | "XXL";
type BrandStockMap = Map<string, Map<SizeName, number>>;

type EnquiryForm = {
  customerName: string;
  assignerName: string;
  customRequirement: string;
  combinations: RequirementCombination[];
  shippingImage: string;
  orderStatus: OrderStatus;
  notes: string;
  extractedAddress: string;
};

const brandOptions: BrandName[] = ["Plain T-Shirts", "Sunkool", "Ceramic Shield", "R S", "Puma"];
const sizeOptions: SizeName[] = ["S", "M", "L", "XL", "XXL"];
const enquiryOrderStatuses: OrderStatus[] = ["New", "Pending"];
const assignerPresets = ["Raghav Sir", "Devansh Sir"] as const;
const MANUAL_ASSIGNER_VALUE = "__manual__";

// Brand names in Stock Up/Products don't always match spacing exactly (e.g. "R S" vs "RS"),
// so stock lookups compare on a normalized key rather than an exact string match.
function normalizeBrandKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

function buildStockMap(brands: BrandSizeStock[]): BrandStockMap {
  const map: BrandStockMap = new Map();
  for (const brand of brands) {
    const sizeMap = new Map<SizeName, number>();
    for (const { size, stock } of brand.sizes) {
      if ((sizeOptions as string[]).includes(size)) {
        const sizeKey = size as SizeName;
        sizeMap.set(sizeKey, (sizeMap.get(sizeKey) ?? 0) + stock);
      }
    }
    map.set(normalizeBrandKey(brand.brandName), sizeMap);
  }
  return map;
}

function getAvailableStock(stockMap: BrandStockMap, brand: string, size: SizeName): number {
  if (!brand) return 0;
  return stockMap.get(normalizeBrandKey(brand))?.get(size) ?? 0;
}

const initialForm: EnquiryForm = {
  customerName: "",
  assignerName: "Raghav Sir",
  customRequirement: "",
  combinations: [createEmptyCombination()],
  shippingImage: "",
  orderStatus: "New",
  notes: "",
  extractedAddress: "",
};

export function EnquiryPage() {
  const [form, setForm] = useState<EnquiryForm>(initialForm);
  const [shippingImageFile, setShippingImageFile] = useState<File | null>(null);
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [errors, setErrors] = useState<{ customerName?: string; assignerName?: string; requirements?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isManualAssigner, setIsManualAssigner] = useState(false);
  const [isExtractingAddress, setIsExtractingAddress] = useState(false);
  const [isAddressDownloadMenuOpen, setIsAddressDownloadMenuOpen] = useState(false);

  const ocrWorkerRef = useRef<TesseractWorker | null>(null);

  useEffect(() => {
    return () => {
      ocrWorkerRef.current?.terminate();
      ocrWorkerRef.current = null;
    };
  }, []);

  const queryClient = useQueryClient();
  const { data: brandStock = [] } = useQuery({
    queryKey: ["inventory-by-brand"],
    queryFn: fetchInventoryByBrand,
  });
  const stockMap = useMemo(() => buildStockMap(brandStock), [brandStock]);

  // Desktop only — brands added via Management should show up here without a code
  // change; mobile keeps the fixed `brandOptions` list below untouched.
  const isDesktop = useIsDesktopViewport();
  const { data: managedBrands } = useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
    enabled: isDesktop,
  });
  const desktopBrandOptions = useMemo(
    () => (managedBrands?.length ? managedBrands.map((brand) => brand.name) : brandOptions),
    [managedBrands]
  );
  const activeBrandOptions = isDesktop ? desktopBrandOptions : brandOptions;

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["inventory-by-brand"] });
    window.addEventListener(INVENTORY_SYNC_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(INVENTORY_SYNC_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [queryClient]);

  const customerNameHistory = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const item of enquiries) {
      const trimmed = item.customerName.trim();
      const key = trimmed.toLowerCase();
      if (trimmed && !seen.has(key)) {
        seen.add(key);
        names.push(trimmed);
      }
    }
    return names;
  }, [enquiries]);

  const customerNameSuggestions = useMemo(() => {
    const query = form.customerName.trim().toLowerCase();
    const matches = query
      ? customerNameHistory.filter((name) => name.toLowerCase().includes(query))
      : customerNameHistory;
    return matches.slice(0, 8);
  }, [customerNameHistory, form.customerName]);

  useEffect(() => {
    let cancelled = false;

    const loadEnquiries = async () => {
      try {
        const data = await fetchEnquiries();
        if (!cancelled) setEnquiries(data);
      } catch (error) {
        console.error("[EnquiryPage] loadEnquiries failed", error);
        if (!cancelled) toast.error(getErrorMessage(error, "Failed to load enquiries."));
      }
    };

    loadEnquiries();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = <K extends keyof EnquiryForm>(key: K, value: EnquiryForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "customerName") {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const selectCustomerName = (name: string) => {
    updateField("customerName", name);
    setShowCustomerSuggestions(false);
  };

  const handleAssignerSelectChange = (value: string) => {
    if (value === MANUAL_ASSIGNER_VALUE) {
      setIsManualAssigner(true);
      updateField("assignerName", "");
    } else {
      setIsManualAssigner(false);
      updateField("assignerName", value);
    }
  };

  const updateManualAssignerName = (value: string) => {
    updateField("assignerName", value);
    setErrors((current) => ({ ...current, assignerName: undefined }));
  };

  const updateCombination = (id: string, patch: Partial<RequirementCombination>) => {
    setForm((current) => ({
      ...current,
      combinations: current.combinations.map((item) => {
        if (item.id !== id) return item;

        const nextItem = { ...item, ...patch };
        if (patch.brand !== undefined) {
          nextItem.quantities = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
        }

        return nextItem;
      }),
    }));
    setErrors((current) => ({ ...current, requirements: undefined }));
  };

  const incrementQuantity = (id: string, size: SizeName) => {
    setForm((current) => ({
      ...current,
      combinations: current.combinations.map((item) => {
        if (item.id !== id) return item;
        const available = getAvailableStock(stockMap, item.brand, size);
        return {
          ...item,
          quantities: {
            ...item.quantities,
            [size]: Math.min(item.quantities[size] + 1, available),
          },
        };
      }),
    }));
  };

  const decrementQuantity = (id: string, size: SizeName) => {
    setForm((current) => ({
      ...current,
      combinations: current.combinations.map((item) =>
        item.id === id
          ? {
              ...item,
              quantities: {
                ...item.quantities,
                [size]: Math.max(0, item.quantities[size] - 1),
              },
            }
          : item
      ),
    }));
  };

  const setQuantity = (id: string, size: SizeName, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, "");
    const typedValue = digitsOnly === "" ? 0 : Math.max(0, parseInt(digitsOnly, 10));

    setForm((current) => ({
      ...current,
      combinations: current.combinations.map((item) => {
        if (item.id !== id) return item;
        const available = getAvailableStock(stockMap, item.brand, size);
        return {
          ...item,
          quantities: {
            ...item.quantities,
            [size]: Math.min(typedValue, available),
          },
        };
      }),
    }));
  };

  const addCombination = () => {
    setForm((current) => ({ ...current, combinations: [...current.combinations, createEmptyCombination()] }));
  };

  const removeCombination = (id: string) => {
    setForm((current) => {
      const next = current.combinations.filter((item) => item.id !== id);
      return {
        ...current,
        combinations: next.length ? next : [createEmptyCombination()],
      };
    });
  };

  const getOcrWorker = async () => {
    if (!ocrWorkerRef.current) {
      const { createWorker } = await import("tesseract.js");
      ocrWorkerRef.current = await createWorker("eng");
    }
    return ocrWorkerRef.current;
  };

  const extractAddressFromImage = async (dataUrl: string) => {
    setIsExtractingAddress(true);
    try {
      const worker = await getOcrWorker();
      const { data } = await worker.recognize(dataUrl);
      updateField("extractedAddress", data.text.trim());
      if (data.text.trim()) {
        toast.success("Address text extracted — review and edit if needed.");
      } else {
        toast.error("No text found in the image. You can type the address manually.");
      }
    } catch (error) {
      console.error("[EnquiryPage] OCR extraction failed", error);
      toast.error("Could not extract text from the image. You can type the address manually.");
    } finally {
      setIsExtractingAddress(false);
    }
  };

  const copyExtractedAddress = async () => {
    try {
      await navigator.clipboard.writeText(form.extractedAddress);
      toast.success("Address copied.");
    } catch (error) {
      console.error("[EnquiryPage] copy address failed", error);
      toast.error("Could not copy address.");
    }
  };

  const addressDownloadFilename = () => {
    const base = form.customerName.trim() || "enquiry";
    return base.replace(/\s+/g, "-").toLowerCase();
  };

  const downloadAddressAsTxt = () => {
    const text = form.extractedAddress.trim() || "No address text available.";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shipping-address-${addressDownloadFilename()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setIsAddressDownloadMenuOpen(false);
  };

  const downloadAddressAsPdf = async () => {
    const text = form.extractedAddress.trim() || "No address text available.";
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const marginX = 22;
    const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;
    const lineHeightFactor = 1.6;
    const lineHeightMm = doc.getFontSize() * lineHeightFactor * 0.3528;

    let cursorY = 28;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Shipping Address:", marginX, cursorY);
    cursorY += lineHeightMm + 2;

    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, marginX, cursorY, { lineHeightFactor });

    doc.save(`shipping-address-${addressDownloadFilename()}.pdf`);
    setIsAddressDownloadMenuOpen(false);
  };

  const onUploadShippingImage = (file: File | null) => {
    if (!file) {
      setShippingImageFile(null);
      updateField("shippingImage", "");
      updateField("extractedAddress", "");
      return;
    }

    const allowed = ["image/jpg", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, JPEG, or PNG files are allowed.");
      return;
    }

    setShippingImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      updateField("shippingImage", dataUrl);
      if (dataUrl) {
        extractAddressFromImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearForm = () => {
    setForm({
      customerName: "",
      assignerName: "Raghav Sir",
      customRequirement: "",
      combinations: [createEmptyCombination()],
      shippingImage: "",
      orderStatus: "New",
      notes: "",
      extractedAddress: "",
    });
    setShippingImageFile(null);
    setErrors({});
    setShowCustomerSuggestions(false);
    setIsManualAssigner(false);
  };

  const saveEnquiry = async () => {
    const nextErrors: { customerName?: string; assignerName?: string; requirements?: string } = {};

    if (!form.customerName.trim()) {
      nextErrors.customerName = "Customer name is required.";
    }

    if (isManualAssigner && !form.assignerName.trim()) {
      nextErrors.assignerName = "Enter the assigner name.";
    }

    const hasCustomRequirement = Boolean(form.customRequirement.trim());
    const validCombinations = form.combinations.filter(
      (item) => item.brand && sizeOptions.some((size) => item.quantities[size] > 0)
    );
    const hasRequirements = hasCustomRequirement || validCombinations.length > 0;

    if (!hasRequirements) {
      nextErrors.requirements = "Add a custom requirement or at least one brand-size quantity combination.";
    }

    if (!nextErrors.requirements) {
      const stockIssues: string[] = [];
      for (const combo of validCombinations) {
        for (const size of sizeOptions) {
          const qty = combo.quantities[size];
          if (qty <= 0) continue;
          const available = getAvailableStock(stockMap, combo.brand, size);
          if (qty > available) {
            stockIssues.push(`${combo.brand} ${size}: only ${available} in stock`);
          }
        }
      }

      if (stockIssues.length) {
        nextErrors.requirements = `Quantity exceeds available stock — ${stockIssues.join(", ")}.`;
      }
    }

    if (nextErrors.customerName || nextErrors.assignerName || nextErrors.requirements) {
      setErrors(nextErrors);
      toast.error("Please complete required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const savedRecord = await createEnquiry(
        {
          customerName: form.customerName.trim(),
          assignerName: form.assignerName.trim(),
          customRequirement: form.customRequirement.trim(),
          combinations: validCombinations,
          trackingNumber: "",
          orderStatus: form.orderStatus,
          statusHistory: [{ status: form.orderStatus, updated_at: new Date().toISOString() }],
          deliveryDate: form.orderStatus === "Received" ? new Date().toISOString().slice(0, 10) : null,
          notes: form.notes.trim(),
          extractedAddress: form.extractedAddress.trim(),
        },
        shippingImageFile
      );

      setEnquiries((current) => [savedRecord, ...current]);
      notifyInventorySync();
      clearForm();
      toast.success("Enquiry saved.");

      // Deduct from Supabase product_sizes; re-sync dashboard after write completes
      if (validCombinations.length) {
        deductStockForEnquiry(validCombinations, savedRecord.orderId)
          .then(() => notifyInventorySync())
          .catch((err) => console.error("[EnquiryPage] deductStockForEnquiry failed", err));
      }
    } catch (error) {
      console.error("[EnquiryPage] saveEnquiry failed", error);
      toast.error(getErrorMessage(error, "Failed to save enquiry."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Enquiry</h1>
        <p className="text-sm text-slate-500">Capture customer enquiry details in a clean mobile workflow.</p>
      </div>

      <Card className="rounded-3xl border-blue-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          <div className="relative">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Name</label>
            <Input
              className="h-11 rounded-2xl"
              placeholder="Enter customer name"
              value={form.customerName}
              onChange={(event) => {
                updateField("customerName", event.target.value);
                setShowCustomerSuggestions(true);
              }}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => setShowCustomerSuggestions(false)}
              autoComplete="off"
            />
            {showCustomerSuggestions && customerNameSuggestions.length ? (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {customerNameSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectCustomerName(name)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}
            {errors.customerName ? <p className="mt-1 text-xs text-rose-500">{errors.customerName}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Assigner Name</label>
            <div className="relative">
              <select
                className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={isManualAssigner ? MANUAL_ASSIGNER_VALUE : form.assignerName}
                onChange={(event) => handleAssignerSelectChange(event.target.value)}
              >
                {assignerPresets.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value={MANUAL_ASSIGNER_VALUE}>Other (Enter manually)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            {isManualAssigner ? (
              <Input
                className="mt-2 h-11 rounded-2xl"
                placeholder="Type assigner name"
                value={form.assignerName}
                onChange={(event) => updateManualAssignerName(event.target.value)}
                autoFocus
              />
            ) : null}
            {errors.assignerName ? <p className="mt-1 text-xs text-rose-500">{errors.assignerName}</p> : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements</label>

            <Input
              className="h-11 rounded-2xl bg-white"
              placeholder="Type custom requirement"
              value={form.customRequirement}
              onChange={(event) => updateField("customRequirement", event.target.value)}
            />

            <div className="space-y-2">
              {form.combinations.map((item) => {
                const showSizes = Boolean(item.brand);

                return (
                  <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          value={item.brand}
                          onChange={(event) => updateCombination(item.id, { brand: event.target.value as BrandName })}
                        >
                          <option value="">Select brand</option>
                          {activeBrandOptions.map((brand) => (
                            <option key={brand} value={brand}>
                              {brand}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      </div>

                      {form.combinations.length > 1 ? (
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700"
                          onClick={() => removeCombination(item.id)}
                          aria-label="Remove requirement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <div
                      className={`transition-all duration-300 ${showSizes ? "mt-3 max-h-[440px] opacity-100" : "max-h-0 opacity-0"}`}
                    >
                      {showSizes ? (
                        <div className="space-y-2">
                          {sizeOptions.map((size) => {
                            const available = getAvailableStock(stockMap, item.brand, size);
                            const outOfStock = available <= 0;
                            const atMax = item.quantities[size] >= available;

                            return (
                              <div
                                key={size}
                                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                                  outOfStock ? "bg-slate-100 dark:bg-slate-900/60" : "bg-blue-50/70 dark:bg-blue-950/40"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{size} PCS</p>
                                  {outOfStock ? (
                                    <p className="text-xs font-semibold text-rose-500">Out of stock</p>
                                  ) : (
                                    <p className="text-[11px] text-slate-400">{available} available</p>
                                  )}
                                </div>

                                {outOfStock ? (
                                  <span className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                                    Out of Stock
                                  </span>
                                ) : (
                                  <div className="flex shrink-0 items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={item.quantities[size] <= 0}
                                      className="rounded-lg border border-slate-300 bg-white p-3 text-slate-700 hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                                      onClick={() => decrementQuantity(item.id, size)}
                                      aria-label={`Decrease ${size} quantity`}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={item.quantities[size]}
                                      onChange={(event) => setQuantity(item.id, size, event.target.value)}
                                      onFocus={(event) => event.target.select()}
                                      aria-label={`${size} quantity`}
                                      className="h-11 w-16 shrink-0 rounded-lg border border-slate-300 bg-white text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                    />
                                    <button
                                      type="button"
                                      disabled={atMax}
                                      className="rounded-lg border border-slate-300 bg-white p-3 text-slate-700 hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                                      onClick={() => incrementQuantity(item.id, size)}
                                      aria-label={`Increase ${size} quantity`}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button type="button" variant="outline" className="h-10 rounded-2xl" onClick={addCombination}>
              <Plus className="mr-1 h-4 w-4" /> Add Brand
            </Button>
            {errors.requirements ? <p className="text-xs text-rose-500">{errors.requirements}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Shipping Address Screenshot</label>
            <label className="flex h-28 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload JPG / JPEG / PNG
              </span>
              <input
                type="file"
                accept="image/jpg,image/jpeg,image/png"
                className="hidden"
                onChange={(event) => onUploadShippingImage(event.target.files?.[0] ?? null)}
              />
            </label>
            {form.shippingImage ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                <img src={form.shippingImage} alt="Shipping screenshot" className="h-36 w-full rounded-xl object-cover" />
              </div>
            ) : null}
          </div>

          {form.shippingImage ? (
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Shipping Address</label>
                <div className="flex items-center gap-2">
                  {isExtractingAddress ? <span className="text-[11px] text-slate-400">Extracting…</span> : null}
                  {form.extractedAddress ? (
                    <div className="relative hidden lg:block">
                      <button
                        type="button"
                        onClick={() => setIsAddressDownloadMenuOpen((open) => !open)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <FileDown className="h-3.5 w-3.5" /> Download Address
                      </button>
                      {isAddressDownloadMenuOpen ? (
                        <div className="absolute right-0 z-10 mt-1 w-28 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                          <button
                            type="button"
                            onClick={downloadAddressAsPdf}
                            className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={downloadAddressAsTxt}
                            className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            TXT
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="relative">
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder={isExtractingAddress ? "Extracting text from image…" : "Extracted address will appear here — edit if needed"}
                  value={form.extractedAddress}
                  onChange={(event) => updateField("extractedAddress", event.target.value)}
                />
                {form.extractedAddress ? (
                  <button
                    type="button"
                    onClick={copyExtractedAddress}
                    className="absolute right-2 top-2 rounded-lg border border-slate-200 bg-white p-3 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900"
                    aria-label="Copy extracted address"
                    title="Copy address"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Order Status</label>
            <div className="relative">
              <select
                className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={form.orderStatus}
                onChange={(event) => updateField("orderStatus", event.target.value as OrderStatus)}
              >
                {enquiryOrderStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Note / Remarks</label>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Add any extra notes or remarks for this order"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </div>

          <Button type="button" disabled={isSaving} className="h-11 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-700" onClick={saveEnquiry}>
            {isSaving ? "Saving..." : "Save Enquiry"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
