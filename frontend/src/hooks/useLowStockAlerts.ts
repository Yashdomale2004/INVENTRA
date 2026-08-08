import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { INVENTORY_SYNC_EVENT } from "../lib/inventorySync";
import { fetchLowStockAlerts } from "../services/inventory";

export const LOW_STOCK_ALERTS_QUERY_KEY = ["low-stock-alerts"];

/**
 * Live low-stock alerts, derived from current product_sizes vs their minimum
 * threshold rather than a persisted log — so an alert simply stops appearing
 * once the size is restocked above minimum, with nothing to clear manually.
 */
export function useLowStockAlerts() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: LOW_STOCK_ALERTS_QUERY_KEY,
    queryFn: fetchLowStockAlerts,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: LOW_STOCK_ALERTS_QUERY_KEY });
    window.addEventListener(INVENTORY_SYNC_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(INVENTORY_SYNC_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [queryClient]);

  return query;
}
