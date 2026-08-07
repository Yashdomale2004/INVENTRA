import { ChevronDown, Minus, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { getErrorMessage } from "../lib/errors";
import { notifyInventorySync } from "../lib/inventorySync";
import { createEmptyCombination, type OrderStatus, type RequirementCombination } from "../lib/orderStorage";
import { createEnquiry, fetchEnquiries, type EnquiryRecord } from "../services/enquiries";
import { deductStockForEnquiry } from "../services/inventory";

type BrandName = "Sunkool" | "Ceramic Shield" | "R S" | "Puma" | "Plain T-Shirts";
type SizeName = "S" | "M" | "L" | "XL";

type EnquiryForm = {
  customerName: string;
  assignerName: string;
  customRequirement: string;
  combinations: RequirementCombination[];
  shippingImage: string;
  orderStatus: OrderStatus;
  notes: string;
};

const brandOptions: BrandName[] = ["Plain T-Shirts", "Sunkool", "Ceramic Shield", "R S", "Puma"];
const sizeOptions: SizeName[] = ["S", "M", "L", "XL"];
const enquiryOrderStatuses: OrderStatus[] = ["New", "Pending"];
const assignerPresets = ["Raghav Sir", "Devansh Sir"] as const;
const MANUAL_ASSIGNER_VALUE = "__manual__";

const initialForm: EnquiryForm = {
  customerName: "",
  assignerName: "Raghav Sir",
  customRequirement: "",
  combinations: [createEmptyCombination()],
  shippingImage: "",
  orderStatus: "New",
  notes: "",
};

export function EnquiryPage() {
  const [form, setForm] = useState<EnquiryForm>(initialForm);
  const [shippingImageFile, setShippingImageFile] = useState<File | null>(null);
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [errors, setErrors] = useState<{ customerName?: string; assignerName?: string; requirements?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isManualAssigner, setIsManualAssigner] = useState(false);

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
          nextItem.quantities = { S: 0, M: 0, L: 0, XL: 0 };
        }

        return nextItem;
      }),
    }));
    setErrors((current) => ({ ...current, requirements: undefined }));
  };

  const incrementQuantity = (id: string, size: SizeName) => {
    setForm((current) => ({
      ...current,
      combinations: current.combinations.map((item) =>
        item.id === id
          ? {
              ...item,
              quantities: {
                ...item.quantities,
                [size]: item.quantities[size] + 1,
              },
            }
          : item
      ),
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
    const nextValue = digitsOnly === "" ? 0 : Math.max(0, parseInt(digitsOnly, 10));

    setForm((current) => ({
      ...current,
      combinations: current.combinations.map((item) =>
        item.id === id
          ? {
              ...item,
              quantities: {
                ...item.quantities,
                [size]: nextValue,
              },
            }
          : item
      ),
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

  const onUploadShippingImage = (file: File | null) => {
    if (!file) {
      setShippingImageFile(null);
      updateField("shippingImage", "");
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
      updateField("shippingImage", String(reader.result ?? ""));
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
                          {brandOptions.map((brand) => (
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
                          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700"
                          onClick={() => removeCombination(item.id)}
                          aria-label="Remove requirement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <div
                      className={`transition-all duration-300 ${showSizes ? "mt-3 max-h-[360px] opacity-100" : "max-h-0 opacity-0"}`}
                    >
                      {showSizes ? (
                        <div className="space-y-2">
                          {sizeOptions.map((size) => (
                            <div key={size} className="flex items-center justify-between rounded-xl bg-blue-50/70 px-3 py-2 dark:bg-blue-950/40">
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{size} PCS</p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 hover:border-blue-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
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
                                  className="h-8 w-14 shrink-0 rounded-lg border border-slate-300 bg-white text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                />
                                <button
                                  type="button"
                                  className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 hover:border-blue-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                                  onClick={() => incrementQuantity(item.id, size)}
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
