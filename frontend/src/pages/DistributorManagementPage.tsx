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
import { createDistributor, deleteDistributor, fetchDistributors, updateDistributor } from "../services/inventory";
import type { Distributor } from "../types";

const distributorSchema = z.object({
  distributor_name: z.string().min(1),
  company_name: z.string().min(1),
  gst_number: z.string().optional(),
  mobile: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  whatsapp: z.string().optional(),
  status: z.boolean(),
});

type DistributorValues = z.infer<typeof distributorSchema>;

export function DistributorManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Distributor | null>(null);
  const { data } = useQuery({ queryKey: ["distributors"], queryFn: fetchDistributors });

  const filtered = useMemo(() => {
    return (data ?? []).filter((item) => [item.distributor_name, item.company_name, item.mobile, item.email, item.gst_number, item.city, item.state].join(" ").toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const form = useForm<DistributorValues>({
    resolver: zodResolver(distributorSchema) as Resolver<DistributorValues>,
    defaultValues: {
      distributor_name: editing?.distributor_name ?? "",
      company_name: editing?.company_name ?? "",
      gst_number: editing?.gst_number ?? "",
      mobile: editing?.mobile ?? "",
      email: editing?.email ?? "",
      address: editing?.address ?? "",
      city: editing?.city ?? "",
      state: editing?.state ?? "",
      pincode: editing?.pincode ?? "",
      whatsapp: editing?.whatsapp ?? "",
      status: editing?.status ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: DistributorValues) => {
      if (editing) return updateDistributor(editing.id, values);
      return createDistributor(values);
    },
    onSuccess: async () => {
      toast.success(editing ? "Distributor updated." : "Distributor added.");
      await queryClient.invalidateQueries({ queryKey: ["distributors"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      setEditing(null);
      form.reset();
    },
    onError: () => toast.error("Could not save distributor."),
  });

  const onSubmit = (values: DistributorValues) => mutation.mutate(values);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Distributor Management</h2>
        <p className="text-sm text-slate-500">Add, edit, search, and delete distributor records.</p>
      </div>
      <Card>
        <Input placeholder="Search distributor" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>
      <Card>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <Input placeholder="Distributor Name" {...form.register("distributor_name")} />
          <Input placeholder="Company Name" {...form.register("company_name")} />
          <Input placeholder="GST Number" {...form.register("gst_number")} />
          <Input placeholder="Phone Number" {...form.register("mobile")} />
          <Input placeholder="Email" {...form.register("email")} />
          <Input placeholder="WhatsApp" {...form.register("whatsapp")} />
          <Input placeholder="Address" {...form.register("address")} />
          <Input placeholder="City" {...form.register("city")} />
          <Input placeholder="State" {...form.register("state")} />
          <Input placeholder="Pincode" {...form.register("pincode")} />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" {...form.register("status")} /> Active
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => { setEditing(null); form.reset(); }}>Clear</Button>
            <Button type="submit">{editing ? "Update Distributor" : "Add Distributor"}</Button>
          </div>
        </form>
      </Card>
      <Card>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-4">Distributor</th><th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Phone</th><th className="py-2 pr-4">City</th><th className="py-2 pr-4">Actions</th></tr></thead>
            <tbody>
              {filtered.map((item) => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3 pr-4">{item.distributor_name}</td><td className="py-3 pr-4">{item.company_name}</td><td className="py-3 pr-4">{item.mobile}</td><td className="py-3 pr-4">{item.city}</td><td className="py-3 pr-4 flex gap-2"><Button variant="outline" size="sm" onClick={() => { setEditing(item); form.reset(item); }}>Edit</Button><Button variant="ghost" size="sm" onClick={() => deleteDistributor(item.id).then(() => queryClient.invalidateQueries({ queryKey: ["distributors"] }))}>Delete</Button></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
