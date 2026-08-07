import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "../components/shared/EmptyState";
import { Skeleton } from "../components/shared/Skeleton";
import { Card } from "../components/ui/card";
import { fetchAllocationHistory } from "../services/inventory";
import type { StockTransaction } from "../types";

export function AllocationHistoryPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["allocation-history"], queryFn: fetchAllocationHistory });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-16" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <EmptyState title="Allocation history unavailable" description="Could not load outgoing stock movements right now." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Allocation History</h2>
        <p className="text-sm text-slate-500">Review every stock-out movement, recipient, and returned history in one place.</p>
      </div>

      <Card>
        {data?.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Color</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Allocated To</th>
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: StockTransaction) => (
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
                    <td className="py-3 pr-4">{item.invoice_number || "-"}</td>
                    <td className="py-3 pr-4">{item.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No allocations yet" description="Use Allocate Stock to create the first allocation record." />
        )}
      </Card>
    </div>
  );
}