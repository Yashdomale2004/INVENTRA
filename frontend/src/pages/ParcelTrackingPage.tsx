import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCcw, Search } from "lucide-react";
import { useMemo, useState, type SelectHTMLAttributes } from "react";
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
import { createParcel, fetchDistributors, fetchParcels, fetchProducts, fetchSuppliers } from "../services/inventory";
import type { Distributor, Parcel, Product, Supplier } from "../types";

const parcelSchema = z.object({
  parcel_id: z.string().min(1, "Tracking ID is required"),
  tracking_number: z.string().min(1, "Tracking number is required"),
  barcode: z.string().min(1, "Barcode is required"),
  qr_code: z.string().min(1, "QR code is required"),
  distributor: z.string().nullable(),
  supplier: z.string().nullable(),
  invoice_number: z.string().optional(),
  product: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().positive(),
  dispatch_date: z.string().optional(),
  arrival_date: z.string().optional(),
  delivery_date: z.string().optional(),
  current_location: z.string().min(1, "Current location is required"),
  current_status: z.string().min(1, "Status is required"),
  assigned_person: z.string().optional(),
  remarks: z.string().optional(),
});

type ParcelValues = z.infer<typeof parcelSchema>;

function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 ${className ?? ""}`} {...props} />;
}

export function ParcelTrackingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeResult, setActiveResult] = useState<Parcel | null>(null);

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: distributors } = useQuery({ queryKey: ["distributors"], queryFn: fetchDistributors });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });
  const { data: parcels, isLoading } = useQuery({ queryKey: ["parcels"], queryFn: () => fetchParcels() });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ParcelValues>({
    resolver: zodResolver(parcelSchema) as Resolver<ParcelValues>,
    defaultValues: {
      parcel_id: "",
      tracking_number: "",
      barcode: "",
      qr_code: "",
      distributor: null,
      supplier: null,
      invoice_number: "",
      product: "",
      quantity: 1,
      dispatch_date: "",
      arrival_date: "",
      delivery_date: "",
      current_location: "",
      current_status: "ordered",
      assigned_person: "",
      remarks: "",
    },
  });

  const statuses = useMemo(() => ["ordered", "packed", "dispatched", "in_transit", "arrived", "received", "delivered", "returned", "cancelled"], []);

  const mutation = useMutation({
    mutationFn: createParcel,
    onSuccess: async (data) => {
      toast.success("Parcel saved successfully.");
      setActiveResult(data as Parcel);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["parcels"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not save parcel."),
  });

  const onSubmit = (values: ParcelValues) => {
    mutation.mutate({
      parcel_id: values.parcel_id,
      tracking_number: values.tracking_number,
      barcode: values.barcode,
      qr_code: values.qr_code,
      distributor: values.distributor,
      supplier: values.supplier,
      invoice_number: values.invoice_number || "",
      product: values.product,
      quantity: values.quantity,
      dispatch_date: values.dispatch_date || null,
      arrival_date: values.arrival_date || null,
      delivery_date: values.delivery_date || null,
      current_location: values.current_location,
      current_status: values.current_status,
      assigned_person: values.assigned_person || "",
      remarks: values.remarks || "",
    });
  };

  const searchParcel = async () => {
    if (!searchTerm.trim()) {
      setActiveResult(null);
      return;
    }

    const match = (parcels ?? []).find((item) =>
      [item.parcel_id, item.tracking_number, item.barcode, item.qr_code].some((value) => value.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (match) {
      setActiveResult(match);
      return;
    }

    toast.error("No parcel found for that tracking ID or tracking number.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Parcel Tracking</h2>
          <p className="text-sm text-slate-500">Track parcels by tracking ID or tracking number and keep full movement history.</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["parcels"] })}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="border-teal-200/80 bg-gradient-to-br from-white to-cyan-50/70 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row">
          <Input placeholder="Enter tracking ID / tracking number / barcode" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Button type="button" onClick={searchParcel}>
            <Search className="mr-2 h-4 w-4" /> Check Tracking
          </Button>
        </div>
        {activeResult && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Tracking ID</p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{activeResult.parcel_id}</h3>
              </div>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-900/30 dark:text-teal-200">
                {activeResult.current_status}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-slate-600 dark:text-slate-300">
              <div><span className="block text-xs uppercase text-slate-400">Tracking No.</span>{activeResult.tracking_number}</div>
              <div><span className="block text-xs uppercase text-slate-400">Location</span>{activeResult.current_location}</div>
              <div><span className="block text-xs uppercase text-slate-400">Assigned</span>{activeResult.assigned_person || "-"}</div>
              <div><span className="block text-xs uppercase text-slate-400">Invoice</span>{activeResult.invoice_number || "-"}</div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add / Update Parcel</h3>
        <form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking ID</label>
            <Input placeholder="PARCEL-001" {...register("parcel_id")} />
            {errors.parcel_id && <p className="mt-1 text-xs text-rose-500">{errors.parcel_id.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking No.</label>
            <Input placeholder="TN-0001" {...register("tracking_number")} />
            {errors.tracking_number && <p className="mt-1 text-xs text-rose-500">{errors.tracking_number.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Barcode</label>
            <Input placeholder="CODE128 / UPC / EAN13" {...register("barcode")} />
            {errors.barcode && <p className="mt-1 text-xs text-rose-500">{errors.barcode.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">QR Code</label>
            <Input placeholder="QR-001" {...register("qr_code")} />
            {errors.qr_code && <p className="mt-1 text-xs text-rose-500">{errors.qr_code.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Wholesaler / Distributor</label>
            <Select {...register("distributor", { setValueAs: (value) => (value === "" ? null : value) })}>{distributors?.length ? <><option value="">Optional distributor</option>{distributors.map((item: Distributor) => <option key={item.id} value={item.id}>{item.company_name}</option>)}</> : <option value="">No distributors found</option>}</Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</label>
            <Select {...register("supplier", { setValueAs: (value) => (value === "" ? null : value) })}>{suppliers?.length ? <><option value="">Optional supplier</option>{suppliers.map((item: Supplier) => <option key={item.id} value={item.id}>{item.supplier_name}</option>)}</> : <option value="">No suppliers found</option>}</Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Product</label>
            <Select {...register("product")}>{products?.length ? <><option value="">Select product</option>{products.map((item: Product) => <option key={item.id} value={item.id}>{item.name}</option>)}</> : <option value="">No products found</option>}</Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</label>
            <Input type="number" min="1" {...register("quantity")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Dispatch Date</label>
            <Input type="date" {...register("dispatch_date")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Arrival Date</label>
            <Input type="date" {...register("arrival_date")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery Date</label>
            <Input type="date" {...register("delivery_date")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Current Location</label>
            <Input placeholder="Warehouse / City" {...register("current_location")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Current Status</label>
            <Select {...register("current_status")}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Person</label>
            <Input placeholder="Courier / staff name" {...register("assigned_person")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice Number</label>
            <Input placeholder="INV-001" {...register("invoice_number")} />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</label>
            <Input placeholder="Delivery notes" {...register("remarks")} />
          </div>
          <div className="lg:col-span-2 flex justify-end">
            <Button disabled={isSubmitting || mutation.isPending}>Save Parcel</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Parcels</h3>
        {isLoading ? (
          <div className="mt-4 space-y-3">{Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-12" />)}</div>
        ) : parcels?.length ? (
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Tracking ID</th>
                  <th className="py-2 pr-4">Tracking No.</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Barcode</th>
                </tr>
              </thead>
              <tbody>
                {parcels.slice(0, 8).map((item: Parcel) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-3 pr-4">{item.parcel_id}</td>
                    <td className="py-3 pr-4">{item.tracking_number}</td>
                    <td className="py-3 pr-4">{item.current_status}</td>
                    <td className="py-3 pr-4">{item.current_location}</td>
                    <td className="py-3 pr-4">{item.barcode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="No parcels yet" description="Create a parcel or search by tracking ID / tracking number to view tracking status." />
          </div>
        )}
      </Card>
    </div>
  );
}
