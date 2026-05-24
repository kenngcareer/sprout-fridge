import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Camera, Check, Loader2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

const SCAN_IMAGE = "https://images.pexels.com/photos/4443439/pexels-photo-4443439.jpeg";

export default function CameraScan({ onClose, onCommit }) {
  const [phase, setPhase] = useState("scanning"); // scanning -> review
  const [detected, setDetected] = useState([]);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    const start = Date.now();
    api.simulateScan().then(({ detected }) => {
      const elapsed = Date.now() - start;
      const minDelay = 2400;
      const wait = Math.max(0, minDelay - elapsed);
      setTimeout(() => {
        // Assign stable IDs so React keys don't rely on array index
        const withIds = detected.map((d, i) => ({ ...d, _id: `${d.name}-${i}-${start}` }));
        setDetected(withIds);
        const initSel = {};
        withIds.forEach((d) => { initSel[d._id] = true; });
        setSelected(initSel);
        setPhase("review");
      }, wait);
    }).catch(() => {
      toast.error("Scan failed");
      onClose();
    });
    // onClose is captured intentionally; effect runs once on mount to start the scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommit = async () => {
    const items = detected.filter((d) => selected[d._id]).map((d) => ({
      name: d.name,
      category: d.category,
      quantity: d.quantity,
      unit: d.unit,
      expires_at: d.expires_at,
      emoji: d.emoji,
    }));
    if (items.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    try {
      const res = await api.commitScan(items);
      toast.success(`Added ${res.count} items to your fridge`);
      onCommit();
    } catch (e) {
      toast.error("Couldn't add items");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4">
      <div
        className="bg-cream w-full max-w-md rounded-3xl border border-line shadow-2xl overflow-hidden animate-fade-up max-h-[88vh] flex flex-col"
        data-testid="scan-dialog"
      >
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-sage flex items-center justify-center">
              <Camera className="w-4 h-4 text-cream" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-ash font-semibold">Fridge scan</div>
              <div className="font-outfit font-semibold text-ink text-base leading-tight">
                {phase === "scanning" ? "Identifying items..." : "Review what we found"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="scan-close"
            className="w-9 h-9 rounded-full bg-oat hover:bg-line flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-ink" />
          </button>
        </div>

        {phase === "scanning" ? (
          <div className="p-4">
            <div className="scan-frame relative aspect-[4/3] bg-ink/10">
              <img src={SCAN_IMAGE} alt="Fridge interior" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-sage/10 via-transparent to-sage/15" />
              <div className="scan-line animate-scan-line" />
              <div className="detect-pulse" style={{ top: "32%", left: "22%" }} />
              <div className="detect-pulse" style={{ top: "58%", left: "70%", animationDelay: "0.4s" }} />
              <div className="detect-pulse" style={{ top: "44%", left: "48%", animationDelay: "0.8s" }} />
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-ash">
              <Loader2 className="w-4 h-4 animate-spin text-sage" />
              Analyzing shelves and freshness...
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-2 overflow-y-auto" data-testid="scan-results">
              <div className="text-xs text-ash mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sage-dark" />
                Found <span className="font-semibold text-ink">{detected.length}</span> items. Tap to include.
              </div>
              {detected.map((d) => (
                <button
                  key={d._id}
                  onClick={() => setSelected({ ...selected, [d._id]: !selected[d._id] })}
                  data-testid={`detected-${d._id}`}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left ${
                    selected[d._id] ? "bg-sage-light border-sage" : "bg-white border-line"
                  }`}
                >
                  <span className="text-2xl">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-outfit font-semibold text-ink text-sm leading-tight">{d.name}</div>
                    <div className="text-[11px] text-ash mt-0.5">
                      {d.quantity} {d.unit} · {Math.round(d.confidence * 100)}% confidence
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    selected[d._id] ? "bg-sage text-cream" : "bg-oat text-ash"
                  }`}>
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-line bg-cream/80 flex gap-2">
              <button
                onClick={onClose}
                data-testid="scan-cancel"
                className="flex-1 bg-oat text-ink rounded-full py-3 text-sm font-semibold hover:bg-line transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                data-testid="scan-commit"
                className="flex-1 bg-sage text-cream rounded-full py-3 text-sm font-semibold hover:bg-sage-dark transition-colors"
              >
                Add to fridge
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
