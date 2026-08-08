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
        <p className="text-sm text-slate-500 dark:text-slate-400">Add, edit, search, and delete distributor records.</p>
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
        {filtered.length ? (
          <div className="grid gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{item.distributor_name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.company_name}</p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <p className="truncate"><span className="text-slate-400">Phone: </span>{item.mobile || "-"}</p>
                  <p className="truncate"><span className="text-slate-400">City: </span>{item.city || "-"}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(item); form.reset(item); }}>Edit</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDistributor(item.id).then(() => queryClient.invalidateQueries({ queryKey: ["distributors"] }))}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No distributors found.</p>
        )}
      </Card>
    </div>
  );
}
