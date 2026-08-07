import { Search } from "lucide-react";
import { useState } from "react";

import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { supabase } from "../lib/supabase";

export function ScannerPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const searchByCode = async () => {
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .or(`barcode.eq.${code},qr_code.eq.${code}`)
      .maybeSingle();

    if (product) {
      setResult({ type: "Product", ...product });
      return;
    }

    const { data: parcel } = await supabase
      .from("parcels")
      .select("*")
      .or(`barcode.eq.${code},qr_code.eq.${code}`)
      .maybeSingle();

    if (parcel) {
      setResult({ type: "Parcel", ...parcel });
    } else {
      setResult({ error: "No product or parcel found." });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Barcode & QR Scanner</h2>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input placeholder="Scan or enter barcode / QR code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-white" onClick={searchByCode}>
            <Search className="mr-2 h-4 w-4" /> Search
          </button>
        </div>
      </Card>

      {result && (
        <Card>
          <pre className="overflow-auto text-xs text-slate-700 dark:text-slate-200">{JSON.stringify(result, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}
