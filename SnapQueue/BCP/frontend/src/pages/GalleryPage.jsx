import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const categories = ["all", "weddings", "birthdays", "events", "portraits"];

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const query = category === "all" ? "" : `?category=${category}`;
    api
      .get(`/gallery${query}`)
      .then((res) => setItems(res.data.items || []))
      .catch(() => setItems([]));
  }, [category]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="container mx-auto py-3 md:py-4 px-4 flex items-start md:items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-slate-100/80 text-slate-700 text-sm font-semibold">Back to Home</Link>
          <div className="text-left">
            <h1 className="text-lg md:text-xl font-extrabold text-slate-900 leading-tight">Gallery</h1>
            <p className="text-[10px] md:text-xs text-slate-500">Explore our portfolio</p>
          </div>
        </div>
      </header>

      <section className="bg-slate-50 py-4 md:py-6 overflow-x-auto">
        <div className="px-4 md:px-8 flex gap-2 md:gap-3 flex-nowrap md:flex-wrap justify-start md:justify-center">
          {categories.map((item) => (
            <button
              key={item}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full border text-sm md:text-base font-medium transition-all whitespace-nowrap ${category === item ? "border-blue-500 bg-blue-500 text-white shadow-md" : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-500"}`}
              onClick={() => setCategory(item)}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}.0
            </button>
          ))}
        </div>
      </section>

      <main className="flex-grow py-6 md:py-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {items.map((item) => (
              <div key={item._id} className="group relative aspect-[4/5] rounded-lg md:rounded-xl overflow-hidden shadow-lg bg-slate-200">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end pb-4 md:pb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-base md:text-xl font-bold text-center px-2">{item.title}</p>
                  <p className="text-blue-300 text-[10px] md:text-sm uppercase tracking-widest mt-1">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <section className="bg-slate-900 py-8 md:py-16 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl text-white font-bold mb-3 md:mb-4">Love what you see?</h2>
          <p className="text-slate-400 mb-6 md:mb-8 max-w-lg mx-auto text-sm md:text-base">Book your photography session today and let us help you create beautiful, lasting memories.</p>
          <Link to="/reservation" className="inline-block px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white text-sm md:text-base font-bold rounded-lg hover:bg-blue-700 transition-all">Book Your Session Now</Link>
        </div>
      </section>

      <footer className="bg-black text-gray-200 py-8 sm:py-10 md:py-12">
        <div className="container mx-auto px-3 sm:px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">SnapQueue</h3>
            <p className="text-gray-400 text-sm sm:text-base">Professional photography services capturing your most precious moments.</p>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
              <li><a href="/#home" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="/#about" className="hover:text-white transition-colors">About</a></li>
              <li><a href="/#samples" className="hover:text-white transition-colors">Gallery</a></li>
              <li><a href="/#contact" className="hover:text-white transition-colors">Contact</a></li>
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
      </footer>
    </div>
  );
}

