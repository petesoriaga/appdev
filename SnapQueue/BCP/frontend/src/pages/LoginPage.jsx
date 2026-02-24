import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

export default function LoginPage() {
  const [mode, setMode] = useState("signin");
  const [signin, setSignin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({ fullName: "", email: "", password: "", confirm: "", phone: "" });
  const [message, setMessage] = useState({ text: "", error: false });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = new URLSearchParams(location.search).get("redirect");

  const showMessage = (text, error = false) => setMessage({ text, error });

  const submitSignin = async (e) => {
    e.preventDefault();

    if (!signin.email.toLowerCase().endsWith("@gmail.com") || signin.password.length < 6) {
      showMessage("Invalid Email or Password!", true);
      return;
    }

    try {
      const res = await api.post("/auth/signin", { email: signin.email.toLowerCase(), password: signin.password });
      login(res.data);
      localStorage.setItem("userLoggedIn", "true");
      showMessage("Sign in successful!", false);
      navigate(redirectTarget === "reservation" ? "/reservation" : "/dashboard");
    } catch (error) {
      showMessage(error.response?.data?.message || "Sign in failed!", true);
    }
  };

  const submitSignup = async (e) => {
    e.preventDefault();

    if (!signup.fullName.trim() || !signup.email.toLowerCase().endsWith("@gmail.com") || !passRegex.test(signup.password) || signup.confirm !== signup.password || signup.phone.length < 10) {
      showMessage("Check all requirements.", true);
      return;
    }

    try {
      const res = await api.post("/auth/signup", {
        fullName: signup.fullName,
        email: signup.email.toLowerCase(),
        phone: signup.phone,
        password: signup.password
      });
      login(res.data);
      localStorage.setItem("userLoggedIn", "true");
      showMessage("Account created!", false);
      navigate("/dashboard");
    } catch (error) {
      showMessage(error.response?.data?.message || "Sign up failed!", true);
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex items-center justify-center font-sans md:p-4">
      {message.text ? (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center px-4 py-3 rounded-lg shadow-2xl text-xs font-bold text-white ${message.error ? "bg-red-600" : "bg-blue-600"}`}>
          {message.text}
        </div>
      ) : null}

      <Link to="/" className="hidden md:absolute md:top-6 md:left-6 md:inline-flex md:items-center md:gap-2 md:text-white md:hover:text-blue-400 md:font-medium">
        <span>Back to Home</span>
      </Link>

      <div className="w-full h-full md:h-[500px] md:max-w-4xl bg-white md:rounded-[2.5rem] md:shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="hidden md:flex md:w-1/2 md:p-8 md:flex-col md:justify-center md:items-center md:text-center md:bg-gray-200 shrink-0">
          <h2 className="text-blue-600 font-bold text-xl mb-2 tracking-tighter">SnapQueue</h2>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{mode === "signin" ? "Welcome back!" : "Join Us!"}</h1>
          <p className="text-gray-500 mb-6 text-sm">Connect with us on social media</p>
          <p className="text-gray-400 text-xs italic">Your Budget Friendly Photographer</p>
        </div>

        <div className="w-full md:w-1/2 bg-gray-50 p-6 flex flex-col h-full overflow-hidden">
          <div className="flex items-center gap-2 mb-4 md:hidden shrink-0">
            <h2 className="text-blue-600 font-bold text-xl tracking-tighter">SnapQueue</h2>
            <Link to="/" className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-semibold">Home</Link>
          </div>

          <div className="flex bg-gray-200 rounded-xl p-1 mb-4 shrink-0 gap-2">
            <button onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${mode === "signin" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>SIGN IN</button>
            <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${mode === "signup" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>SIGN UP</button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {mode === "signin" ? (
              <form onSubmit={submitSignin} className="space-y-3" noValidate>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                  <input value={signin.email} onChange={(e) => setSignin((prev) => ({ ...prev, email: e.target.value }))} type="email" placeholder="example@gmail.com" className="w-full px-4 py-2.5 bg-gray-200 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                  <input value={signin.password} onChange={(e) => setSignin((prev) => ({ ...prev, password: e.target.value }))} type="password" placeholder="Password" className="w-full px-4 py-2.5 bg-gray-200 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-12 text-sm" />
                </div>
                <button type="submit" className="w-full py-3.5 bg-blue-500 text-white font-black rounded-xl shadow-lg uppercase tracking-widest mt-2 text-xs">Sign In</button>
                <p className="text-center text-xs text-gray-500 mt-4">New User? <button type="button" className="text-blue-600 font-bold" onClick={() => setMode("signup")}>Signup</button></p>
              </form>
            ) : (
              <form onSubmit={submitSignup} className="space-y-3" noValidate>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                  <input value={signup.fullName} onChange={(e) => setSignup((prev) => ({ ...prev, fullName: e.target.value }))} type="text" placeholder="John Doe" className="w-full px-4 py-2.5 bg-gray-200 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                  <input value={signup.email} onChange={(e) => setSignup((prev) => ({ ...prev, email: e.target.value }))} type="email" placeholder="example@gmail.com" className="w-full px-4 py-2.5 bg-gray-200 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                  <input value={signup.password} onChange={(e) => setSignup((prev) => ({ ...prev, password: e.target.value }))} type="password" placeholder="Password" className="w-full px-4 py-2.5 bg-gray-200 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  <p className="text-[10px] text-blue-600 font-bold px-1 leading-tight mt-1">Required: 8+ chars, 1 Uppercase, 1 Num, 1 Sym.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Confirm Password</label>
                  <input value={signup.confirm} onChange={(e) => setSignup((prev) => ({ ...prev, confirm: e.target.value }))} type="password" placeholder="Confirm Password" className="w-full px-4 py-2.5 bg-gray-200 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Phone Number</label>
                  <input value={signup.phone} onChange={(e) => setSignup((prev) => ({ ...prev, phone: e.target.value }))} type="tel" placeholder="09XX XXX XXXX" className="w-full px-4 py-2.5 bg-gray-200 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <button type="submit" className="w-full py-3.5 bg-blue-600 text-white font-black rounded-xl shadow-lg uppercase tracking-widest mt-2 text-xs">Create Account</button>
                <p className="text-center text-xs text-gray-500 mt-4 pb-4">Already have an account? <button type="button" className="text-blue-600 font-bold" onClick={() => setMode("signin")}>Sign In</button></p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
