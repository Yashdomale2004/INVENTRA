import { useQuery } from "@tanstack/react-query";

import { fetchDashboardStats } from "../services/dashboard";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardStats,
  });
}
