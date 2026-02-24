import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const packagePrices = {
  basic: 500,
  premium: 1000,
  deluxe: 1500
};

const pesoCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export default function PaymentPage() {
  const reservation = JSON.parse(localStorage.getItem("latestReservation") || "null");
  const [method, setMethod] = useState("");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const amount = useMemo(() => {
    if (!reservation) return 0;
    return packagePrices[reservation.packageName] || 500;
  }, [reservation]);

  if (!reservation) {
    return <div className="min-h-screen p-8"><div className="max-w-md mx-auto bg-white rounded-xl border border-slate-200 p-6">No reservation found. Please create a reservation first.</div></div>;
  }

  const submit = async () => {
    if (!method) {
      setError("Select a payment method first.");
      return;
    }
    if (!proof) {
      setError("Upload proof of payment first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.post("/payments", {
        reservationId: reservation._id,
        method: method.toLowerCase(),
        amount,
        referenceNumber: `proof-${Date.now()}`,
        proofUrl: proof ? proof.name : ""
      });
      localStorage.removeItem("tempReservation");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Payment submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6">
      <div className="w-full md:max-w-md">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Finalize Reservation</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2">Please complete the payment to secure your slot.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-slate-900 p-4 md:p-6 text-white">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Total Amount</span>
              <span className="bg-blue-500 text-[10px] md:text-xs px-2 py-1 rounded font-bold">RESERVATION FEE</span>
            </div>
            <div className="text-3xl md:text-4xl font-black mt-2 md:mt-3">{pesoCurrencyFormatter.format(amount)}</div>
          </div>

          {!method ? (
            <div className="p-4 md:p-6">
              <h3 className="text-xs md:text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Choose Payment Method</h3>
              <div className="space-y-3">
                <button onClick={() => setMethod("GCash")} className="w-full border-2 border-slate-100 p-3 md:p-4 rounded-xl flex items-center justify-between hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold italic">G</div><span className="font-bold text-slate-700">GCash</span></div>
                  <span className="text-slate-400">&gt;</span>
                </button>
                <button onClick={() => setMethod("Maya")} className="w-full border-2 border-slate-100 p-3 md:p-4 rounded-xl flex items-center justify-between hover:border-green-200 transition-all">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">M</div><span className="font-bold text-slate-700">Maya</span></div>
                  <span className="text-slate-400">&gt;</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <button onClick={() => { setMethod(""); setProof(null); }} className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-slate-400 hover:text-slate-600 mb-4 uppercase">Change Method</button>
              <div className="text-center mb-6">
                <h3 className="text-base md:text-lg font-bold text-slate-900">Pay via {method}</h3>
                <p className="text-[11px] md:text-xs text-slate-500 mt-1">Scan the QR code below and pay exactly {pesoCurrencyFormatter.format(amount)}.</p>
              </div>
              <div className="bg-slate-100 aspect-square rounded-2xl mb-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
                <span className="text-slate-400 text-xs font-bold">OFFICIAL STUDIO QR</span>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wide">Upload Proof of Payment</span>
                  <input type="file" accept="image/*" className="mt-3 block w-full text-xs" onChange={(e) => setProof(e.target.files?.[0] || null)} />
                </label>
                <button onClick={submit} disabled={!proof || loading} className="w-full py-4 md:py-3 bg-blue-600 text-white font-bold rounded-xl disabled:bg-slate-300 disabled:cursor-not-allowed uppercase tracking-wide text-xs md:text-sm">
                  {loading ? "Verifying..." : "Submit Payment"}
                </button>
                {error ? <p className="text-xs text-red-600 font-bold">{error}</p> : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
