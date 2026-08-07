import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RefreshCcw } from "lucide-react";
import { useMemo, type SelectHTMLAttributes } from "react";
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
import { getErrorMessage } from "../lib/errors";
import { createStockAllocation, fetchAllocationHistory, fetchProductSizes, fetchProducts } from "../services/inventory";
import type { Product, ProductSize, StockTransaction } from "../types";

const allocationSchema = z.object({
  product: z.string().min(1, "Product is required"),
  product_size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  recipient_type: z.enum(["employee", "branch", "person"]),
  recipient_name: z.string().min(1, "Person, employee, or branch is required"),
  reference_number: z.string().optional(),
  quantity: z.coerce.number().int().positive(),
  remarks: z.string().optional(),
});

type AllocationValues = z.infer<typeof allocationSchema>;

function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 ${className ?? ""}`} {...props} />;
}

const colorOptions = ["Black", "White", "Navy", "Blue", "Red", "Green", "Grey", "Yellow", "Maroon", "Custom"];

export function AllocateStockPage() {
  const queryClient = useQueryClient();
  const { data: products, isLoading: productsLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: productSizes, isLoading: sizesLoading } = useQuery({ queryKey: ["product-sizes"], queryFn: fetchProductSizes });
  const { data: allocationHistory, isLoading: historyLoading } = useQuery({ queryKey: ["allocation-history"], queryFn: fetchAllocationHistory });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<AllocationValues>({
    resolver: zodResolver(allocationSchema) as Resolver<AllocationValues>,
    defaultValues: {
      product: "",
      product_size: "",
      color: "Black",
      recipient_type: "employee",
      recipient_name: "",
      reference_number: "",
      quantity: 1,
      remarks: "",
    },
  });

  const selectedProduct = watch("product");
  const selectedSize = watch("product_size");
  const selectedColor = watch("color");
  const availableSize = useMemo(() => {
    return (productSizes ?? []).find((size) => String(size.id) === String(selectedSize));
  }, [productSizes, selectedSize]);

  const filteredSizes = useMemo(() => {
    return (productSizes ?? []).filter((size) => String(size.product) === String(selectedProduct));
  }, [productSizes, selectedProduct]);

  const mutation = useMutation({
    mutationFn: async (values: AllocationValues) => {
      return createStockAllocation({
        product: values.product,
        product_size: values.product_size,
        quantity: values.quantity,
        color: values.color,
        allocated_to_type: values.recipient_type,
        allocated_to: values.recipient_name,
        invoice_number: values.reference_number,
        notes: values.remarks ?? "",
      });
    },
    onSuccess: async () => {
      toast.success("Stock allocated and inventory updated.");
      reset({ product: "", product_size: "", color: "Black", recipient_type: "employee", recipient_name: "", reference_number: "", quantity: 1, remarks: "" });
      await queryClient.invalidateQueries({ queryKey: ["allocation-history"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product-sizes"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not allocate stock."));
    },
  });

  const onSubmit = async (values: AllocationValues) => {
    const currentStock = Number(availableSize?.current_stock ?? 0);
    if (values.quantity > currentStock) {
      toast.error(`Only ${currentStock} units are available for this size.`);
      return;
    }

    mutation.mutate(values);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Allocate Stock</h2>
          <p className="text-sm text-slate-500">Move T-shirt stock to a person, employee, or branch and update available inventory immediately.</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["allocation-history"] })}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="border-teal-200/80 bg-gradient-to-br from-white to-teal-50/70 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
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
            {selectedSize && <p className="mt-2 text-xs text-slate-500">Available stock: {Number(availableSize?.current_stock ?? 0)}</p>}
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient Type</label>
            <Select {...register("recipient_type")}>
              <option value="employee">Employee</option>
              <option value="branch">Branch</option>
              <option value="person">Person</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Person / Employee / Branch</label>
            <Input placeholder="Name or branch" {...register("recipient_name")} />
            {errors.recipient_name && <p className="mt-1 text-xs text-rose-500">{errors.recipient_name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</label>
            <Input type="number" min="1" placeholder="0" {...register("quantity")} />
            {errors.quantity && <p className="mt-1 text-xs text-rose-500">{errors.quantity.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reference No.</label>
            <Input placeholder="ALLOC-0001" {...register("reference_number")} />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</label>
            <Input placeholder="Optional allocation notes" {...register("remarks")} />
          </div>

          <div className="lg:col-span-2 flex justify-end">
            <Button disabled={isSubmitting || mutation.isPending || !selectedProduct || !selectedSize}>
              <Plus className="mr-2 h-4 w-4" /> {mutation.isPending ? "Allocating..." : "Allocate Stock"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Allocations</h3>
          <p className="text-xs text-slate-500">{selectedColor ? `Color focus: ${selectedColor}` : ""}</p>
        </div>
        {historyLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12" />
            ))}
          </div>
        ) : allocationHistory?.length ? (
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Color</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Allocated To</th>
                  <th className="py-2 pr-4">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {allocationHistory.slice(0, 8).map((item: StockTransaction) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-3 pr-4">{new Date(item.transaction_date).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">{item.product_name ?? item.product}</td>
                    <td className="py-3 pr-4">{item.product_size_name ?? item.product_size}</td>
                    <td className="py-3 pr-4">{item.color || "-"}</td>
                    <td className="py-3 pr-4">{item.quantity}</td>
                    <td className="py-3 pr-4">
                      {item.allocated_to_type ? `${item.allocated_to_type}: ` : ""}
                      {item.allocated_to ?? "-"}
                    </td>
                    <td className="py-3 pr-4">{item.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="No allocations yet" description="Allocate stock from the form above to start building history." />
          </div>
        )}
      </Card>
    </div>
  );
}