import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { createBrand, createCategory, createProduct, deleteProduct, fetchBrands, fetchCategories, fetchProducts, updateProduct } from "../services/inventory";
import type { Brand, Category, Product } from "../types";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().min(1, "Brand is required"),
  unit: z.string().min(1, "Unit is required"),
  minimum_stock: z.coerce.number().int().min(0),
  purchase_price: z.string().min(1, "Purchase price is required"),
  description: z.string().optional(),
  status: z.boolean(),
  image: z.any().optional(),
  sizes: z.array(z.string()).optional(),
});

type ProductValues = z.infer<typeof productSchema>;

function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:text-slate-200">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" {...props} />;
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" {...props} />;
}

function ProductForm({ initial, onCancel, onSaved }: { initial?: Product | null; onCancel: () => void; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: brands } = useQuery({ queryKey: ["brands"], queryFn: fetchBrands });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");

  const sizePresets = ["S", "M", "L", "XL"];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProductValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductValues>,
    defaultValues: {
      name: initial?.name ?? "",
      category: initial?.category ?? undefined,
      brand: initial?.brand ?? undefined,
      unit: initial?.unit ?? "pcs",
      minimum_stock: initial?.minimum_stock ?? 0,
      purchase_price: initial?.purchase_price ?? "",
      description: initial?.description ?? "",
      status: initial?.status ?? true,
      sizes: initial?.sizes?.map((size) => size.size).filter((size) => sizePresets.includes(size)) ?? [],
      image: undefined,
    },
  });

  useEffect(() => {
    reset({
      name: initial?.name ?? "",
      category: initial?.category ?? undefined,
      brand: initial?.brand ?? undefined,
      unit: initial?.unit ?? "pcs",
      minimum_stock: initial?.minimum_stock ?? 0,
      purchase_price: initial?.purchase_price ?? "",
      description: initial?.description ?? "",
      status: initial?.status ?? true,
      sizes: initial?.sizes?.map((size) => size.size).filter((size) => sizePresets.includes(size)) ?? [],
      image: undefined,
    });
  }, [initial, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ProductValues) => {
      const payload = new FormData();
      payload.append("name", values.name);
      payload.append("category", String(values.category));
      payload.append("brand", String(values.brand));
      payload.append("unit", values.unit);
      payload.append("minimum_stock", String(values.minimum_stock));
      payload.append("purchase_price", values.purchase_price);
      payload.append("description", values.description ?? "");
      payload.append("status", String(values.status));
      payload.append("sizes", JSON.stringify(values.sizes ?? []));
      if (values.image instanceof FileList && values.image[0]) payload.append("image", values.image[0]);

      if (initial) {
        return updateProduct(initial.id, payload);
      }
      return createProduct(payload);
    },
    onSuccess: async () => {
      toast.success(initial ? "Product updated." : "Product created.");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onSaved();
    },
    onError: () => toast.error("Could not save product."),
  });

  const categoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      toast.success("Category created.");
      setNewCategoryName("");
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Could not create category."),
  });

  const brandMutation = useMutation({
    mutationFn: createBrand,
    onSuccess: async () => {
      toast.success("Brand created.");
      setNewBrandName("");
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
    onError: () => toast.error("Could not create brand."),
  });

  const selectedSizes = watch("sizes") ?? [];

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Product Name</label>
        <Input {...register("name")} />
        {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
        <Select {...register("category")}>
          <option value="">Select category</option>
          {categories?.map((item: Category) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        {!categories?.length && (
          <div className="mt-2 flex gap-2">
            <Input placeholder="New category" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            <Button
              type="button"
              variant="outline"
              onClick={() => newCategoryName.trim() && categoryMutation.mutate({ name: newCategoryName.trim(), description: "", status: true })}
            >
              Add
            </Button>
          </div>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Brand</label>
        <Select {...register("brand")}>
          <option value="">Select brand</option>
          {brands?.map((item: Brand) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        {!brands?.length && (
          <div className="mt-2 flex gap-2">
            <Input placeholder="New brand" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} />
            <Button
              type="button"
              variant="outline"
              onClick={() => newBrandName.trim() && brandMutation.mutate({ name: newBrandName.trim(), description: "", status: true })}
            >
              Add
            </Button>
          </div>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</label>
        <Select {...register("unit")}> <option value="pcs">Pieces</option> <option value="kg">Kilogram</option> <option value="ltr">Liter</option> <option value="box">Box</option> </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Minimum Stock</label>
        <Input type="number" min="0" {...register("minimum_stock", { valueAsNumber: true })} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase Price</label>
        <Input {...register("purchase_price")} />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">T-Shirt Sizes</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {sizePresets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                selectedSizes.includes(preset)
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
              }`}
              onClick={() => {
                const next = selectedSizes.includes(preset)
                  ? selectedSizes.filter((size) => size !== preset)
                  : [...selectedSizes, preset];
                setValue("sizes", next, { shouldDirty: true, shouldValidate: true });
              }}
            >
              {preset}
            </button>
          ))}
        </div>
        {!selectedSizes.length && <p className="mt-2 text-xs text-slate-500">Select one or more standard sizes: S, M, L, XL.</p>}
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
        <TextArea {...register("description")} />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Product Image</label>
        <Input type="file" accept="image/*" {...register("image")} />
      </div>
      <div className="md:col-span-2 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" {...register("status")} /> Active product
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={isSubmitting || mutation.isPending}>{initial ? "Update Product" : "Save Product"}</Button>
        </div>
      </div>
    </form>
  );
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const [search, setSearch] = useState("");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return (products ?? []).filter((product) => [product.name, product.sku, product.barcode, product.category_name, product.brand_name].join(" ").toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      toast.success("Product deleted.");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not delete product."),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Products</h2>
          <p className="text-sm text-slate-500">Manage product master data and sizes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/brands")}>Manage Brands</Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["products"] })}><RefreshCcw className="mr-2 h-4 w-4" /> Refresh</Button>
          <Button onClick={() => { setActiveProduct(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add New Product</Button>
        </div>
      </div>

      <Card>
        <Input placeholder="Search product, brand or category" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <Card>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading products...</p>
        ) : filtered.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Brand</th>
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2 pr-4">Min Stock</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-3 pr-4">{item.name}</td>
                    <td className="py-3 pr-4">{item.category_name}</td>
                    <td className="py-3 pr-4">{item.brand_name}</td>
                    <td className="py-3 pr-4">{item.sizes?.reduce((total, size) => total + size.current_stock, 0) ?? 0}</td>
                    <td className="py-3 pr-4">{item.minimum_stock}</td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setActiveProduct(item); setOpen(true); }}><Edit2 className="mr-2 h-4 w-4" /> Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No products found.</p>
        )}
      </Card>

      <Dialog open={open} title={activeProduct ? "Edit Product" : "Add New Product"} onClose={() => setOpen(false)}>
        <ProductForm initial={activeProduct} onCancel={() => setOpen(false)} onSaved={() => setOpen(false)} />
      </Dialog>
    </div>
  );
}
