import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { createSupplier, deleteSupplier, fetchSuppliers, updateSupplier } from "../services/inventory";
import type { Supplier } from "../types";

const supplierSchema = z.object({
  supplier_name: z.string().min(1),
  company_name: z.string().optional(),
  gst: z.string().optional(),
  mobile: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.boolean(),
});

type SupplierValues = z.infer<typeof supplierSchema>;

export function SupplierManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const { data } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });

  const filtered = useMemo(() => {
    return (data ?? []).filter((item) => [item.supplier_name, item.company_name, item.mobile, item.email, item.gst, item.city, item.state].join(" ").toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const form = useForm<SupplierValues>({
    resolver: zodResolver(supplierSchema) as Resolver<SupplierValues>,
    defaultValues: {
      supplier_name: editing?.supplier_name ?? "",
      company_name: editing?.company_name ?? "",
      gst: editing?.gst ?? "",
      mobile: editing?.mobile ?? "",
      email: editing?.email ?? "",
      address: editing?.address ?? "",
      city: editing?.city ?? "",
      state: editing?.state ?? "",
      status: editing?.status ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: SupplierValues) => {
      if (editing) return updateSupplier(editing.id, values);
      return createSupplier(values);
    },
    onSuccess: async () => {
      toast.success(editing ? "Supplier updated." : "Supplier added.");
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      setEditing(null);
      form.reset();
    },
    onError: () => toast.error("Could not save supplier."),
  });

  const onSubmit = (values: SupplierValues) => mutation.mutate(values);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Supplier Management</h2>
        <p className="text-sm text-slate-500">Add, edit, search, and delete supplier records.</p>
      </div>
      <Card>
        <Input placeholder="Search supplier" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>
      <Card>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <Input placeholder="Supplier Name" {...form.register("supplier_name")} />
          <Input placeholder="Company" {...form.register("company_name")} />
          <Input placeholder="GST Number" {...form.register("gst")} />
          <Input placeholder="Mobile" {...form.register("mobile")} />
          <Input placeholder="Email" {...form.register("email")} />
          <Input placeholder="Address" {...form.register("address")} />
          <Input placeholder="City" {...form.register("city")} />
          <Input placeholder="State" {...form.register("state")} />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" {...form.register("status")} /> Active
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => { setEditing(null); form.reset(); }}>Clear</Button>
            <Button type="submit">{editing ? "Update Supplier" : "Add Supplier"}</Button>
          </div>
        </form>
      </Card>
      <Card>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-4">Supplier</th><th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Mobile</th><th className="py-2 pr-4">City</th><th className="py-2 pr-4">Actions</th></tr></thead>
            <tbody>
              {filtered.map((item) => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3 pr-4">{item.supplier_name}</td><td className="py-3 pr-4">{item.company_name}</td><td className="py-3 pr-4">{item.mobile}</td><td className="py-3 pr-4">{item.city}</td><td className="py-3 pr-4 flex gap-2"><Button variant="outline" size="sm" onClick={() => { setEditing(item); form.reset(item); }}>Edit</Button><Button variant="ghost" size="sm" onClick={() => deleteSupplier(item.id).then(() => queryClient.invalidateQueries({ queryKey: ["suppliers"] }))}>Delete</Button></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
