import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "../components/shared/EmptyState";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Input } from "../components/ui/input";
import { getErrorMessage } from "../lib/errors";
import { notifyInventorySync } from "../lib/inventorySync";
import {
  createBrandWithLogo,
  createProduct,
  deleteBrand,
  deleteProduct,
  fetchBrands,
  fetchProducts,
  findOrCreateCategoryByName,
  updateBrand,
  updateProduct,
} from "../services/inventory";
import type { Brand, Product } from "../types";

const PRODUCT_TYPES = ["Plain", "Printed", "Branded"] as const;
const SIZE_OPTIONS = ["S", "M", "L", "XL"] as const;

const productSchema = z.object({
  name: z.string().min(1, "Product/brand name is required"),
  type: z.enum(PRODUCT_TYPES),
  brand: z.string().min(1, "Brand is required"),
  sizes: z.array(z.string()).min(1, "Select at least one size"),
});
type ProductValues = z.infer<typeof productSchema>;

const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
});
type BrandValues = z.infer<typeof brandSchema>;

function ProductForm({
  initial,
  brands,
  onCancel,
  onSaved,
}: {
  initial?: Product | null;
  brands: Brand[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const initialType = PRODUCT_TYPES.includes(initial?.category_name as (typeof PRODUCT_TYPES)[number])
    ? (initial!.category_name as (typeof PRODUCT_TYPES)[number])
    : "Plain";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductValues>,
    defaultValues: {
      name: initial?.name ?? "",
      type: initialType,
      brand: initial?.brand ?? "",
      sizes: initial?.sizes?.map((size) => size.size) ?? [],
    },
  });

  useEffect(() => {
    reset({
      name: initial?.name ?? "",
      type: initialType,
      brand: initial?.brand ?? "",
      sizes: initial?.sizes?.map((size) => size.size) ?? [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ProductValues) => {
      const categoryId = await findOrCreateCategoryByName(values.type);

      if (initial) {
        return updateProduct(initial.id, {
          name: values.name,
          category: categoryId,
          brand: values.brand,
          unit: "pcs",
          minimum_stock: 0,
          purchase_price: "0",
          selling_price: "0",
          description: "",
          status: true,
        });
      }

      return createProduct({
        name: values.name,
        category: categoryId,
        brand: values.brand,
        unit: "pcs",
        minimum_stock: 0,
        purchase_price: "0",
        selling_price: "0",
        description: "",
        status: true,
        sizes: JSON.stringify(values.sizes),
      });
    },
    onSuccess: async () => {
      toast.success(initial ? "Product updated." : "Product added.");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-by-brand"] });
      notifyInventorySync();
      onSaved();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Could not save product.")),
  });

  const selectedSizes = watch("sizes") ?? [];

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Product / Brand Name
        </label>
        <Input {...register("name")} placeholder="e.g. Sunkool" />
        {errors.name ? <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</label>
        <select
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          {...register("type")}
        >
          {PRODUCT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Brand</label>
        <select
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          {...register("brand")}
        >
          <option value="">Select brand</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        {errors.brand ? <p className="mt-1 text-xs text-rose-500">{errors.brand.message}</p> : null}
        {!brands.length ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add a brand below first.</p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sizes</label>
        {initial ? (
          <div className="flex flex-wrap gap-2">
            {selectedSizes.length ? (
              selectedSizes.map((size) => (
                <span
                  key={size}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400"
                >
                  {size}
                </span>
              ))
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">No sizes on this product yet.</p>
            )}
            <p className="w-full text-xs text-slate-400 dark:text-slate-500">Sizes can't be changed after creation.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    const next = selectedSizes.includes(size)
                      ? selectedSizes.filter((s) => s !== size)
                      : [...selectedSizes, size];
                    setValue("sizes", next, { shouldValidate: true, shouldDirty: true });
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    selectedSizes.includes(size)
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:text-slate-200"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            {errors.sizes ? <p className="mt-1 text-xs text-rose-500">{errors.sizes.message}</p> : null}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
        <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isSubmitting || mutation.isPending} className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
          {initial ? "Update Product" : "Save Product"}
        </Button>
      </div>
    </form>
  );
}

function BrandForm({ initial, onCancel, onSaved }: { initial?: Brand | null; onCancel: () => void; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BrandValues>({
    resolver: zodResolver(brandSchema) as Resolver<BrandValues>,
    defaultValues: { name: initial?.name ?? "" },
  });

  useEffect(() => {
    reset({ name: initial?.name ?? "" });
    setLogoFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, reset]);

  const mutation = useMutation({
    mutationFn: async (values: BrandValues) => {
      if (initial) return updateBrand(initial.id, { name: values.name, logoFile });
      return createBrandWithLogo(values.name, logoFile);
    },
    onSuccess: async () => {
      toast.success(initial ? "Brand updated." : "Brand added.");
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
      notifyInventorySync();
      onSaved();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Could not save brand.")),
  });

  return (
    <form className="space-y-3" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Brand Name</label>
        <Input {...register("name")} placeholder="e.g. Sunkool" />
        {errors.name ? <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Logo (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
        />
        {initial?.logo_url && !logoFile ? (
          <img
            src={initial.logo_url}
            alt=""
            className="mt-2 h-12 w-12 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
          />
        ) : null}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isSubmitting || mutation.isPending} className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
          {initial ? "Update Brand" : "Save Brand"}
        </Button>
      </div>
    </form>
  );
}

export function ManagementPage() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: brands = [], isLoading: isLoadingBrands } = useQuery({ queryKey: ["brands"], queryFn: fetchBrands });

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [showBrandForm, setShowBrandForm] = useState(false);

  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);
  const [deleteBrandTarget, setDeleteBrandTarget] = useState<Brand | null>(null);

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      toast.success("Product deleted.");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-by-brand"] });
      notifyInventorySync();
      setDeleteProductTarget(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Could not delete product.")),
  });

  const deleteBrandMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: async () => {
      toast.success("Brand deleted.");
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
      notifyInventorySync();
      setDeleteBrandTarget(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Could not delete brand.")),
  });

  return (
    <div className="w-full min-w-0 space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 sm:text-2xl">Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add new T-shirt products and brands here — they become available in Stock Up and Enquiry automatically.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              {activeProduct ? "Edit Product" : "Add New T-Shirt / Product"}
            </h2>
            {!showProductForm ? (
              <Button
                type="button"
                className="h-9 rounded-xl bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
                onClick={() => {
                  setActiveProduct(null);
                  setShowProductForm(true);
                }}
              >
                Add Product
              </Button>
            ) : null}
          </div>

          {showProductForm ? (
            <div className="mt-4">
              <ProductForm
                initial={activeProduct}
                brands={brands}
                onCancel={() => {
                  setShowProductForm(false);
                  setActiveProduct(null);
                }}
                onSaved={() => {
                  setShowProductForm(false);
                  setActiveProduct(null);
                }}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Create a product with a name, type, brand, and available sizes.
            </p>
          )}
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              {activeBrand ? "Edit Brand" : "Manage Brands"}
            </h2>
            {!showBrandForm ? (
              <Button
                type="button"
                className="h-9 rounded-xl bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
                onClick={() => {
                  setActiveBrand(null);
                  setShowBrandForm(true);
                }}
              >
                Add Brand
              </Button>
            ) : null}
          </div>

          {showBrandForm ? (
            <div className="mt-4">
              <BrandForm
                initial={activeBrand}
                onCancel={() => {
                  setShowBrandForm(false);
                  setActiveBrand(null);
                }}
                onSaved={() => {
                  setShowBrandForm(false);
                  setActiveBrand(null);
                }}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Add a new brand with an optional logo — it becomes available wherever brands are selected.
            </p>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Existing Brands</h2>
        <div className="mt-4">
          {isLoadingBrands ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : brands.length === 0 ? (
            <EmptyState title="No brands yet" description="Add your first brand above." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {brand.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{brand.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBrand(brand);
                        setShowBrandForm(true);
                      }}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400"
                      aria-label={`Edit ${brand.name}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteBrandTarget(brand)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400"
                      aria-label={`Delete ${brand.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Existing Products</h2>
        <div className="mt-4">
          {isLoadingProducts ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : products.length === 0 ? (
            <EmptyState title="No products yet" description="Add your first T-shirt product above." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{product.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {product.brand_name} · {product.category_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProduct(product);
                          setShowProductForm(true);
                        }}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteProductTarget(product)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400"
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(product.sizes ?? []).map((size) => (
                      <span
                        key={size.id}
                        className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {size.size}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={deleteProductTarget !== null}
        title={`Delete "${deleteProductTarget?.name}"?`}
        description="This removes the product from Stock Up and Enquiry dropdowns. It stays saved in the database."
        confirmLabel={deleteProductMutation.isPending ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={() => deleteProductTarget && deleteProductMutation.mutate(deleteProductTarget.id)}
        onCancel={() => setDeleteProductTarget(null)}
      />

      <ConfirmDialog
        open={deleteBrandTarget !== null}
        title={`Delete "${deleteBrandTarget?.name}"?`}
        description="This removes the brand from Enquiry's brand list. Existing orders and products keep referencing it by name."
        confirmLabel={deleteBrandMutation.isPending ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={() => deleteBrandTarget && deleteBrandMutation.mutate(deleteBrandTarget.id)}
        onCancel={() => setDeleteBrandTarget(null)}
      />
    </div>
  );
}
