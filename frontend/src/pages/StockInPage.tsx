import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RefreshCcw } from "lucide-react";
import { useMemo, useState, type SelectHTMLAttributes } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "../components/shared/EmptyState";
import { Skeleton } from "../components/shared/Skeleton";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { createDistributor, createStockTransaction, createSupplier, fetchDistributors, fetchProductSizes, fetchProducts, fetchStockReceipts, fetchSuppliers } from "../services/inventory";
import type { Distributor, Product, ProductSize, StockTransaction, Supplier } from "../types";

const stockInSchema = z
  .object({
    distributor: z.string().nullable(),
    manual_distributor_name: z.string().optional(),
    manual_company_name: z.string().optional(),
    manual_mobile: z.string().optional(),
    supplier: z.string().nullable(),
    manual_supplier_name: z.string().optional(),
    manual_supplier_company: z.string().optional(),
    manual_supplier_mobile: z.string().optional(),
    color: z.string().min(1, "Color is required"),
    invoice_number: z.string().min(1, "Invoice number is required"),
    product: z.string().min(1, "Product is required"),
    product_size: z.string().min(1, "Size is required"),
    quantity: z.coerce.number().int().positive(),
    unit_cost: z.string().min(1, "Purchase cost is required"),
    received_date: z.string().min(1, "Received date is required"),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.distributor && values.manual_distributor_name?.trim()) {
      if (!values.manual_company_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manual_company_name"],
          message: "Company name is required when adding a distributor manually.",
        });
      }

      if (!values.manual_mobile?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manual_mobile"],
          message: "Phone number is required when adding a distributor manually.",
        });
      }
    }

    if (!values.supplier && values.manual_supplier_name?.trim()) {
      if (!values.manual_supplier_company?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manual_supplier_company"],
          message: "Company name is required when adding a supplier manually.",
        });
      }

      if (!values.manual_supplier_mobile?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manual_supplier_mobile"],
          message: "Phone number is required when adding a supplier manually.",
        });
      }
    }
  });

type StockInValues = z.infer<typeof stockInSchema>;

function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 ${className ?? ""}`} {...props} />;
}

const colorOptions = ["Black", "White", "Navy", "Blue", "Red", "Green", "Grey", "Yellow", "Maroon", "Custom"];

export function StockInPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isManualDistributor, setIsManualDistributor] = useState(false);
  const [isManualSupplier, setIsManualSupplier] = useState(false);
  const { data: products, isLoading: productsLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: productSizes, isLoading: sizesLoading } = useQuery({ queryKey: ["product-sizes"], queryFn: fetchProductSizes });
  const { data: distributors } = useQuery({ queryKey: ["distributors"], queryFn: fetchDistributors });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });
  const { data: stockTransactions, isLoading: transactionsLoading } = useQuery({ queryKey: ["stock-receipts"], queryFn: fetchStockReceipts });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockInValues>({
    resolver: zodResolver(stockInSchema) as Resolver<StockInValues>,
    defaultValues: {
      distributor: null,
      manual_distributor_name: "",
      manual_company_name: "",
      manual_mobile: "",
      supplier: null,
      manual_supplier_name: "",
      manual_supplier_company: "",
      manual_supplier_mobile: "",
      color: "Black",
      invoice_number: "",
      product: "",
      product_size: "",
      quantity: 1,
      unit_cost: "",
      notes: "",
      received_date: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedProduct = watch("product");
  const filteredSizes = useMemo(() => {
    return (productSizes ?? []).filter((size) => String(size.product) === String(selectedProduct));
  }, [productSizes, selectedProduct]);

  const mutation = useMutation({
    mutationFn: async (values: StockInValues) => {
      let distributorId = values.distributor;
      let supplierId = values.supplier;

      if (!distributorId && values.manual_distributor_name?.trim()) {
        const distributor = await createDistributor({
          distributor_name: values.manual_distributor_name.trim(),
          company_name: values.manual_company_name?.trim() || values.manual_distributor_name.trim(),
          mobile: values.manual_mobile?.trim() || "",
          whatsapp: "",
          email: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
          gst_number: "",
          status: true,
        });

        distributorId = distributor.id;
      }

      if (!supplierId && values.manual_supplier_name?.trim()) {
        const supplier = await createSupplier({
          supplier_name: values.manual_supplier_name.trim(),
          company_name: values.manual_supplier_company?.trim() || values.manual_supplier_name.trim(),
          mobile: values.manual_supplier_mobile?.trim() || "",
          email: "",
          address: "",
          city: "",
          state: "",
          gst: "",
          status: true,
        });

        supplierId = supplier.id;
      }

      return createStockTransaction({
        product: values.product,
        product_size: values.product_size,
        transaction_type: "stock_in",
        quantity: values.quantity,
        unit_cost: values.unit_cost,
        color: values.color,
        distributor: distributorId,
        supplier: supplierId,
        invoice_number: values.invoice_number,
        notes: values.notes ?? "",
        transaction_date: `${values.received_date}T00:00:00Z`,
      });
    },
    onSuccess: async () => {
      toast.success("Stock receipt saved and inventory updated.");
      setIsManualDistributor(false);
      setIsManualSupplier(false);
      reset({
        distributor: null,
        manual_distributor_name: "",
        manual_company_name: "",
        manual_mobile: "",
        supplier: null,
        manual_supplier_name: "",
        manual_supplier_company: "",
        manual_supplier_mobile: "",
        color: "Black",
        invoice_number: "",
        product: "",
        product_size: "",
        quantity: 1,
        unit_cost: "",
        notes: "",
        received_date: new Date().toISOString().slice(0, 10),
      });
      await queryClient.invalidateQueries({ queryKey: ["distributors"] });
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-receipts"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not save stock receipt."),
  });

  const onSubmit = (values: StockInValues) => mutation.mutate(values);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Receive Stock</h2>
          <p className="text-sm text-slate-500">Receive incoming T-shirt stock from a wholesaler, distributor, or supplier.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/distributors")}>Add Distributor</Button>
          <Button variant="outline" onClick={() => navigate("/suppliers")}>Add Supplier</Button>
          <Button variant="outline" onClick={() => navigate("/products")}>Add Product</Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["stock-receipts"] })}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border-teal-200/80 bg-gradient-to-br from-white to-teal-50/70 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Wholesaler / Distributor</label>
              <button
                type="button"
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300"
                onClick={() => {
                  setIsManualDistributor((current) => !current);
                  const currentValues = watch();
                  reset({
                    ...currentValues,
                    distributor: null,
                    manual_distributor_name: "",
                    manual_company_name: "",
                    manual_mobile: "",
                  });
                }}
              >
                {isManualDistributor ? "Select existing distributor" : "Add manually"}
              </button>
            </div>
            {isManualDistributor ? (
              <div className="grid gap-3 rounded-2xl border border-dashed border-teal-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <Input placeholder="Distributor name" {...register("manual_distributor_name")} />
                {errors.manual_distributor_name && <p className="-mt-1 text-xs text-rose-500">{errors.manual_distributor_name.message}</p>}
                <Input placeholder="Company name" {...register("manual_company_name")} />
                {errors.manual_company_name && <p className="-mt-1 text-xs text-rose-500">{errors.manual_company_name.message}</p>}
                <Input placeholder="Phone number" {...register("manual_mobile")} />
                {errors.manual_mobile && <p className="-mt-1 text-xs text-rose-500">{errors.manual_mobile.message}</p>}
              </div>
            ) : (
              <Select {...register("distributor", { setValueAs: (value) => (value === "" ? null : value) })}>
                {distributors?.length ? (
                  <>
                    <option value="">Select distributor</option>
                    {distributors.map((item: Distributor) => (
                      <option key={item.id} value={item.id}>
                        {item.company_name} - {item.distributor_name}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="">Add distributors in Distributor Management</option>
                )}
              </Select>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</label>
              <button
                type="button"
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300"
                onClick={() => {
                  setIsManualSupplier((current) => !current);
                  const currentValues = watch();
                  reset({
                    ...currentValues,
                    supplier: null,
                    manual_supplier_name: "",
                    manual_supplier_company: "",
                    manual_supplier_mobile: "",
                  });
                }}
              >
                {isManualSupplier ? "Select existing supplier" : "Add manually"}
              </button>
            </div>
            {isManualSupplier ? (
              <div className="grid gap-3 rounded-2xl border border-dashed border-teal-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <Input placeholder="Supplier name" {...register("manual_supplier_name")} />
                {errors.manual_supplier_name && <p className="-mt-1 text-xs text-rose-500">{errors.manual_supplier_name.message}</p>}
                <Input placeholder="Company name" {...register("manual_supplier_company")} />
                {errors.manual_supplier_company && <p className="-mt-1 text-xs text-rose-500">{errors.manual_supplier_company.message}</p>}
                <Input placeholder="Phone number" {...register("manual_supplier_mobile")} />
                {errors.manual_supplier_mobile && <p className="-mt-1 text-xs text-rose-500">{errors.manual_supplier_mobile.message}</p>}
              </div>
            ) : (
              <Select {...register("supplier", { setValueAs: (value) => (value === "" ? null : value) })}>
                {suppliers?.length ? (
                  <>
                    <option value="">Optional supplier</option>
                    {suppliers.map((item: Supplier) => (
                      <option key={item.id} value={item.id}>
                        {item.supplier_name}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="">Add suppliers in Supplier Management</option>
                )}
              </Select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice Number</label>
            <Input placeholder="INV-0001" {...register("invoice_number")} />
            {errors.invoice_number && <p className="mt-1 text-xs text-rose-500">{errors.invoice_number.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Received Date</label>
            <Input type="date" {...register("received_date")} />
            {errors.received_date && <p className="mt-1 text-xs text-rose-500">{errors.received_date.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Product</label>
            <Select {...register("product")} disabled={productsLoading}>
              {products?.length ? (
                <>
                  <option value="">Select product</option>
                  {products.map((item: Product) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </>
              ) : (
                <option value="">No products found</option>
              )}
            </Select>
            {errors.product && <p className="mt-1 text-xs text-rose-500">{errors.product.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Size</label>
            <Select {...register("product_size")} disabled={sizesLoading || !selectedProduct}>
              {filteredSizes.length ? (
                <>
                  <option value="">Select size</option>
                  {filteredSizes.map((item: ProductSize) => (
                    <option key={item.id} value={item.id}>
                      {item.size} - stock {item.current_stock}
                    </option>
                  ))}
                </>
              ) : (
                <option value="">Choose a product first</option>
              )}
            </Select>
            {errors.product_size && <p className="mt-1 text-xs text-rose-500">{errors.product_size.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Color</label>
            <Select {...register("color")}>
              {colorOptions.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </Select>
            {errors.color && <p className="mt-1 text-xs text-rose-500">{errors.color.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</label>
            <Input type="number" min="1" placeholder="0" {...register("quantity")} />
            {errors.quantity && <p className="mt-1 text-xs text-rose-500">{errors.quantity.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase Cost</label>
            <Input type="number" step="0.01" placeholder="0.00" {...register("unit_cost")} />
            {errors.unit_cost && <p className="mt-1 text-xs text-rose-500">{errors.unit_cost.message}</p>}
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
            <Input placeholder="Optional notes" {...register("notes")} />
          </div>

          <div className="lg:col-span-2 flex justify-end">
            <Button disabled={isSubmitting || mutation.isPending}>
              <Plus className="mr-2 h-4 w-4" /> {mutation.isPending ? "Saving..." : "Save Stock Receipt"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Stock Receipts</h3>
        {transactionsLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12" />
            ))}
          </div>
        ) : stockTransactions?.length ? (
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Color</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2 pr-4">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {stockTransactions.slice(0, 8).map((item: StockTransaction) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-3 pr-4">{new Date(item.transaction_date).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">{item.product_name ?? item.product}</td>
                    <td className="py-3 pr-4">{item.product_size_name ?? item.product_size}</td>
                    <td className="py-3 pr-4">{item.color || "-"}</td>
                    <td className="py-3 pr-4">{item.quantity}</td>
                    <td className="py-3 pr-4">{item.distributor_name ?? item.supplier_name ?? "N/A"}</td>
                    <td className="py-3 pr-4">Rs {item.unit_cost}</td>
                    <td className="py-3 pr-4">{item.invoice_number || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="No stock receipts yet" description="Use the form above to record incoming stock from wholesalers or suppliers." />
          </div>
        )}
      </Card>
    </div>
  );
}
