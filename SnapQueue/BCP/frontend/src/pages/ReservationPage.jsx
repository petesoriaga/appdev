import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  province: "",
  city: "",
  barangay: "",
  street: "",
  eventType: "",
  eventDateTime: "",
  service: "",
  packageName: "",
  durationHours: "",
  notes: ""
};

export default function ReservationPage() {
  const [form, setForm] = useState(initialForm);
  const [terms, setTerms] = useState(false);
  const [toast, setToast] = useState({ text: "", error: false });
  const [loading, setLoading] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://psgc.gitlab.io/api/provinces/")
      .then((res) => res.json())
      .then((data) => setProvinces(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!form.province) {
      setCities([]);
      setBarangays([]);
      setForm((prev) => ({ ...prev, city: "", barangay: "" }));
      return;
    }

    fetch(`https://psgc.gitlab.io/api/provinces/${form.province}/cities-municipalities/`)
      .then((res) => res.json())
      .then((data) => setCities(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setCities([]));
  }, [form.province]);

  useEffect(() => {
    if (!form.city) {
      setBarangays([]);
      setForm((prev) => ({ ...prev, barangay: "" }));
      return;
    }

    fetch(`https://psgc.gitlab.io/api/cities-municipalities/${form.city}/barangays/`)
      .then((res) => res.json())
      .then((data) => setBarangays(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setBarangays([]));
  }, [form.city]);

  const nowMin = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  const selectedProvince = provinces.find((p) => p.code === form.province)?.name || "";
  const selectedCity = cities.find((c) => c.code === form.city)?.name || "";
  const selectedBarangay = barangays.find((b) => b.code === form.barangay)?.name || "";

  const showToast = (text, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast({ text: "", error: false }), 3500);
  };

  const submit = async () => {
    if (!/^[^\s@]+@gmail\.com$/i.test(form.email)) {
      showToast("You must use a valid @gmail.com address", true);
      return;
    }

    if (!form.fullName || !form.phone || !form.province || !form.city || !form.barangay || !form.street || !form.eventType || !form.eventDateTime || !form.service || !form.packageName || !form.durationHours) {
      showToast("Please complete all required fields", true);
      return;
    }

    if (!terms) {
      showToast("You must agree to the terms", true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        province: selectedProvince,
        city: selectedCity,
        barangay: selectedBarangay,
        durationHours: Number(form.durationHours)
      };
      const res = await api.post("/reservations", payload);
      localStorage.setItem("latestReservation", JSON.stringify(res.data.reservation));
      localStorage.setItem("tempReservation", JSON.stringify({ ...payload }));
      const isCustomPackage = String(form.packageName || "").toLowerCase() === "custom";
      if (isCustomPackage) {
        showToast("Custom package submitted. Please wait for admin approval before payment.", false);
        navigate("/dashboard?notice=custom_pending_approval");
      } else {
        showToast("Reservation details saved!", false);
        navigate("/payment");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to submit reservation", true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast.text ? (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center text-white px-4 py-3 rounded-lg shadow-2xl text-xs font-bold ${toast.error ? "bg-red-600" : "bg-blue-600"}`}>
          {toast.text}
        </div>
      ) : null}

      <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium rounded-lg hover:bg-gray-100 px-2 py-1.5 sm:px-3">
            <span>Back to Home</span>
          </Link>
          <div className="text-right flex-1 ml-3 sm:ml-4">
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight">Book Your Session</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Fill out the form to request your session</p>
          </div>
        </div>
      </header>

      <section className="py-8 sm:py-10 md:py-16 px-4 sm:px-6 md:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-3xl">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()} noValidate>
            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg sm:text-xl font-bold mb-5 text-gray-900">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Full Name</label>
                  <input className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg" value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Email (@gmail.com)</label>
                    <input className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Phone</label>
                    <input className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg sm:text-xl font-bold mb-5 text-gray-900">Venue Location</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Province</label>
                  <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white" value={form.province} onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}>
                    <option value="">Select Province</option>
                    {provinces.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">City / Municipality</label>
                  <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} disabled={!form.province}>
                    <option value="">Select City / Municipality</option>
                    {cities.map((city) => <option key={city.code} value={city.code}>{city.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Barangay</label>
                  <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white" value={form.barangay} onChange={(e) => setForm((prev) => ({ ...prev, barangay: e.target.value }))} disabled={!form.city}>
                    <option value="">Select Barangay</option>
                    {barangays.map((barangay) => <option key={barangay.code} value={barangay.code}>{barangay.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Street / Building No.</label>
                  <input className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg" value={form.street} onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg sm:text-xl font-bold mb-5 text-gray-900">Event Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Event Type</label>
                  <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white" value={form.eventType} onChange={(e) => setForm((prev) => ({ ...prev, eventType: e.target.value }))}>
                    <option value="">Select an event type</option>
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday</option>
                    <option value="event">Event</option>
                    <option value="portrait">Portrait</option>
                    <option value="corporate">Corporate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Event Date & Time</label>
                  <input className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white" type="datetime-local" min={nowMin} value={form.eventDateTime} onChange={(e) => setForm((prev) => ({ ...prev, eventDateTime: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg sm:text-xl font-bold mb-5 text-gray-900">Service & Package</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Service</label>
                  <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white" value={form.service} onChange={(e) => setForm((prev) => ({ ...prev, service: e.target.value }))}>
                    <option value="">Select a service</option>
                    <option value="photography">Photography</option>
                    <option value="videography">Videography</option>
                    <option value="both">Photography & Videography</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Package</label>
                  <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white" value={form.packageName} onChange={(e) => setForm((prev) => ({ ...prev, packageName: e.target.value }))}>
                    <option value="">Select a package</option>
                    <option value="basic">Basic - P500</option>
                    <option value="premium">Premium - P1000</option>
                    <option value="deluxe">Deluxe - P1500</option>
                    <option value="custom">Custom Package - Contact for pricing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Duration (hours)</label>
                  <input className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg" type="number" min="1" max="12" value={form.durationHours} onChange={(e) => setForm((prev) => ({ ...prev, durationHours: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg sm:text-xl font-bold mb-5 text-gray-900">Additional Notes (Optional)</h3>
              <textarea className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg resize-none" rows="4" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>

            <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                <span className="text-xs sm:text-sm text-gray-600">I agree to the Terms & Conditions</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pb-4">
              <Link to="/" className="px-6 py-3 border-2 border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-all text-gray-700 font-bold text-center flex-1">Cancel</Link>
              <button type="button" className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-lg disabled:opacity-60" onClick={submit} disabled={loading}>
                {loading ? "Submitting..." : "Submit Reservation"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
