import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

export default function HomePage() {
  const { user, logout } = useAuth();
  const [samples, setSamples] = useState([]);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [contactState, setContactState] = useState({ loading: false, message: "", error: false });

  useEffect(() => {
    api
      .get("/gallery")
      .then((res) => setSamples((res.data.items || []).slice(0, 6)))
      .catch(() => setSamples([]));
  }, []);

  const submitContact = async (event) => {
    event.preventDefault();
    const name = String(contactForm.name || "").trim();
    const email = String(contactForm.email || "").trim();
    const subject = String(contactForm.subject || "").trim();
    const message = String(contactForm.message || "").trim();
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !email || !subject || !message) {
      setContactState({ loading: false, message: "Name, email, subject, and message are required.", error: true });
      return;
    }
    if (!isEmailValid) {
      setContactState({ loading: false, message: "Invalid email format.", error: true });
      return;
    }
    setContactState({ loading: true, message: "", error: false });

    try {
      await api.post("/contact", {
        name,
        email,
        subject,
        message
      });
      setContactState({ loading: false, message: "Message sent successfully.", error: false });
      setContactForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setContactState({
        loading: false,
        message: error.response?.data?.message || "Failed to send message.",
        error: true
      });
    }
  };

  return (
    <div className="font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex justify-between items-center h-12 sm:h-14 md:h-16">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg md:text-xl font-semibold tracking-wide">SnapQueue</h1>
            </div>

            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#home" className="text-sm font-medium hover:text-blue-400">Home</a>
              <a href="#about" className="text-sm font-medium hover:text-blue-400">About</a>
              <a href="#samples" className="text-sm font-medium hover:text-blue-400">Samples</a>
              <Link to="/reservation" className="text-sm font-medium hover:text-blue-400">Reservation</Link>
              <a href="#contact" className="text-sm font-medium hover:text-blue-400">Contact</a>
              {user ? (
                <div className="flex items-center gap-3">
                  <Link to="/dashboard" className="flex items-center gap-2">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 text-white grid place-items-center text-xs font-bold">
                        {(user.fullName || "U").trim().slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium">{user.fullName}</span>
                  </Link>
                  <button onClick={logout} className="px-3 sm:px-4 py-2 text-xs lg:text-sm bg-red-400 text-black font-bold rounded-lg hover:bg-blue-300 transition">Logout</button>
                </div>
              ) : (
                <Link to="/login" className="px-3 sm:px-4 py-2 text-xs lg:text-sm bg-red-400 text-black font-bold rounded-lg hover:bg-blue-300 transition">Sign In</Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div id="home" className="relative isolate overflow-hidden bg-white min-h-screen flex items-center py-8 sm:py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-semibold tracking-tight text-gray-900">Your Budget Friendly Photographer</h2>
            <p className="mt-4 sm:mt-6 md:mt-8 text-sm sm:text-base md:text-lg lg:text-xl font-medium text-gray-700">Let us turn your moments into memories that last forever</p>
          </div>
          <div className="mx-auto mt-6 sm:mt-8 md:mt-10 max-w-2xl lg:mx-0 lg:max-w-none">
            <div className="grid grid-cols-1 gap-y-4">
              <Link to="/reservation" className="inline-block w-fit px-6 py-3 border-2 border-gray-800 text-gray-900 font-bold text-base rounded-lg hover:bg-gray-900 hover:text-white transition">BOOK NOW</Link>
            </div>
            <dl className="mt-8 sm:mt-12 md:mt-16 grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col-reverse gap-1"><dt className="text-sm text-gray-700">Happy Clients</dt><dd className="text-3xl font-semibold tracking-tight text-gray-900">500</dd></div>
              <div className="flex flex-col-reverse gap-1"><dt className="text-sm text-gray-700">Sessions Completed</dt><dd className="text-3xl font-semibold tracking-tight text-gray-900">1,000+</dd></div>
              <div className="flex flex-col-reverse gap-1"><dt className="text-sm text-gray-700">Pictures Delivered</dt><dd className="text-3xl font-semibold tracking-tight text-gray-900">10,000+</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <div id="about" className="relative isolate overflow-hidden bg-white min-h-screen flex items-center py-8 sm:py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:gap-x-12 lg:max-w-none lg:grid-cols-2 lg:items-start">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">About SnapQueue</h1>
              <p className="mt-4 sm:mt-6 md:mt-8 text-sm sm:text-base md:text-lg font-medium text-gray-700">
                Founded in March 2025, SnapQueue has been dedicated to capturing life's most precious moments with artistic excellence and professional care.
              </p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mt-8">Our Mission</h2>
              <p className="mt-4 sm:mt-6 md:mt-8 text-sm sm:text-base md:text-lg font-medium text-gray-700">
                To provide exceptional photography services that exceed expectations, preserve memories, and help our clients shine.
              </p>
            </div>
            <div className="flex justify-center lg:justify-center mx-auto">
              <div className="aspect-[3/4] w-full max-w-[250px] sm:max-w-[300px] rounded-2xl object-cover shadow-2xl bg-slate-200" />
            </div>
          </div>
        </div>
      </div>

      <section id="samples" className="w-full bg-gray-900 text-white min-h-screen flex flex-col justify-center py-12 sm:py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 text-center w-full">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">Featured Work</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {samples.map((item) => (
              <div key={item._id} className="group relative aspect-[4/5] rounded-xl overflow-hidden shadow-lg bg-gray-200">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white font-bold text-sm sm:text-base">{item.title}</p>
                  <p className="text-blue-300 text-xs uppercase tracking-widest mt-1">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8 sm:mt-12">
            <Link to="/gallery" className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-black inline-block text-white text-sm sm:text-base transition-all">View Full Gallery</Link>
          </div>
        </div>
      </section>

      <section id="contact" className="w-full bg-white min-h-screen flex items-center py-16">
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div className="flex flex-col h-full">
              <h2 className="text-3xl font-bold mb-4 text-gray-900">Get in Touch</h2>
              <p className="text-gray-700 mb-8">Questions about packages, availability, or custom shoots? Reach out and we would love to hear from you.</p>
              <div className="space-y-4 text-gray-700 text-sm">
                <p><b>Email:</b> otpaauthetication@gmail.com</p>
                <p><b>Phone:</b> +639095339528</p>
                <p><b>Location:</b> Nueva Ecija, Philippines</p>
              </div>
            </div>

            <div className="bg-gray-50 shadow-lg rounded-2xl p-8 border border-gray-100">
              <form className="space-y-5" onSubmit={submitContact}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input type="text" name="name" value={contactForm.name} onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Your Name" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input type="email" name="email" value={contactForm.email} onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="you@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                  <input type="text" name="subject" value={contactForm.subject} onChange={(e) => setContactForm((prev) => ({ ...prev, subject: e.target.value }))} placeholder="Your subject" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                  <textarea name="message" value={contactForm.message} onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="How can we help you?" rows="4" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all" disabled={contactState.loading}>
                  {contactState.loading ? "Sending..." : "Send Message"}
                </button>
                {contactState.message ? (
                  <p className={`text-sm ${contactState.error ? "text-red-600" : "text-green-600"}`}>
                    {contactState.message}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </section>

      <section id="footer" className="bg-black text-gray-200 py-8 sm:py-10 md:py-12">
        <div className="container mx-auto px-3 sm:px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">SnapQueue</h3>
            <p className="text-gray-400 text-sm sm:text-base">Professional photography services capturing your most precious moments.</p>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
              <li><a href="#home" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#samples" className="hover:text-white transition-colors">Gallery</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
              <li>Email: otpaauthetication@gmail.com</li>
              <li>Phone: +639095339528</li>
              <li>Location: Nueva Ecija, Philippines</li>
            </ul>
            <div className="flex gap-2 sm:gap-4 mt-3 sm:mt-4">
              <a href="https://www.facebook.com/profile.php?id=100079708334779" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-800 hover:bg-[#1877F2] hover:text-white transition-colors flex items-center justify-center" aria-label="Facebook">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.073C22 6.505 17.523 2 12 2S2 6.505 2 12.073c0 5.018 3.657 9.18 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.52 1.492-3.914 3.777-3.914 1.094 0 2.238.197 2.238.197v2.476h-1.26c-1.243 0-1.63.775-1.63 1.57v1.899h2.773l-.443 2.91h-2.33V22c4.78-.76 8.437-4.922 8.437-9.927z"/></svg>
              </a>
              <a href="https://www.instagram.com/petesoriaga/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-800 hover:bg-[#E4405F] hover:text-white transition-colors flex items-center justify-center" aria-label="Instagram">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.849-.07c-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849s.012-3.584.07-4.849c.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="mailto:otpaauthetication@gmail.com" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-800 hover:bg-[#EA4335] hover:text-white transition-colors flex items-center justify-center" aria-label="Email">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75-9.75-6.75" /></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 sm:mt-10 md:mt-12 text-center text-gray-500 text-xs sm:text-sm">(c) 2026 SnapQueue. All rights reserved.</div>
      </section>
    </div>
  );
}

