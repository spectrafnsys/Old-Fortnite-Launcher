import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { appWindow } from "@tauri-apps/api/window";

type User = { email: string; password: string; token: string };
const hash = (str: string) => btoa(str);

export default function Login() {
  const navigate = useNavigate();

  // Simulate launcher running state
  const [launcherRunning, setLauncherRunning] = useState(false);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  const [email, setEmail] = useState(localStorage.getItem("savedEmail") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(localStorage.getItem("rememberMe") === "true");

  const getUsers = (): User[] => {
    const users = localStorage.getItem("users");
    return users ? JSON.parse(users) : [];
  };

  const saveUser = (user: User) => {
    const users = getUsers();
    const index = users.findIndex(u => u.email === user.email);
    if (index > -1) users[index] = user;
    else users.push(user);
    localStorage.setItem("users", JSON.stringify(users));
  };

  // Simulate checking if launcher is online
  useEffect(() => {
    // Here you would detect if the .bat has been run
    // For simulation, we randomly toggle online/offline after 1s
    setTimeout(() => {
      const isOnline = Math.random() > 0.5; // simulate launcher running or not
      setLauncherRunning(isOnline);
      if (!isOnline) {
        setShowOfflineMessage(true);
        setTimeout(() => setShowOfflineMessage(false), 5000);
      } else {
        const loggedIn = localStorage.getItem("user");
        if (loggedIn && remember) navigate("/onboard");
      }
    }, 1000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/\S+@\S+\.\S+/.test(email)) return setError("Please enter a valid email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);

    setTimeout(() => {
      const users = getUsers();
      const existing = users.find(u => u.email === email && u.password === hash(password));

      let token = existing ? existing.token : Math.random().toString(36).substring(2, 15);
      if (!existing) saveUser({ email, password: hash(password), token });

      localStorage.setItem("user", JSON.stringify({ email, password, token }));
      remember ? localStorage.setItem("savedEmail", email) : localStorage.removeItem("savedEmail");
      remember ? localStorage.setItem("rememberMe", "true") : localStorage.removeItem("rememberMe");

      setLoading(false);
      navigate("/onboard");
    }, 1000);
  };

  // --- Offline/Error Page ---
  if (!launcherRunning) {
    return (
      <div className="w-full h-screen relative font-sans overflow-hidden select-none">
        <img
          src="https://i.ibb.co/fzJx9sB8/image-1.webp"
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center px-6 text-center">
          <div
            className="absolute top-0 left-0 w-full h-10 flex justify-between items-center px-4 text-white font-semibold bg-black/80 z-50"
            style={{ WebkitAppRegion: "drag" } as any}
          >
            <span>Nexus Launcher - Offline</span>
            <div className="flex gap-2">
              <button
                onClick={() => appWindow.minimize()}
                className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded"
                style={{ WebkitAppRegion: "no-drag" } as any}
              >
                -
              </button>
              <button
                onClick={() => appWindow.close()}
                className="w-7 h-7 flex items-center justify-center hover:bg-red-600 rounded"
                style={{ WebkitAppRegion: "no-drag" } as any}
              >
                X
              </button>
            </div>
          </div>

          {showOfflineMessage && (
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-700 p-5 rounded-xl shadow-lg mb-6 text-2xl font-bold text-white"
            >
              Error: 5463
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-6xl font-extrabold text-white mb-4"
          >
            Launcher is Offline
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-300 text-lg mb-6 max-w-md"
          >
            The launcher cannot connect. Please join our Discord for support or updates.
          </motion.p>

          <motion.a
            href="https://discord.gg/nexusogfn"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-blue-600 hover:bg-blue-500 px-10 py-4 rounded-xl text-white font-semibold transition transform"
          >
            Join Discord
          </motion.a>
        </div>
      </div>
    );
  }

  // --- Login Page ---
  return (
    <div className="w-[1500px] h-[800px] flex relative select-none overflow-hidden font-sans">
      <div className="absolute inset-0 w-full h-full">
        <img src="https://i.ibb.co/fzJx9sB8/image-1.webp" className="w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      </div>

      <div className="absolute top-0 left-0 w-full h-10 flex justify-between items-center px-4 text-white font-semibold bg-black/80 z-50" style={{ WebkitAppRegion: "drag" } as any}>
        <span>Nexus Launcher - Online</span>
        <div className="flex gap-2">
          <button onClick={() => appWindow.minimize()} className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded" style={{ WebkitAppRegion: "no-drag" } as any}>-</button>
          <button onClick={() => appWindow.close()} className="w-7 h-7 flex items-center justify-center hover:bg-red-600 rounded" style={{ WebkitAppRegion: "no-drag" } as any}>X</button>
        </div>
      </div>

      <div className="w-[460px] h-full bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col justify-start px-10 py-10 z-10">
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex flex-col flex-1">
          <img src="https://i.ibb.co/wF5sQDN2/nexus.png" alt="Logo" className="w-32 mb-10 self-center drop-shadow-lg" />
          <h1 className="text-4xl font-bold mb-6 text-white text-center">Sign In</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
            <div className="flex flex-col">
              <label className="text-sm text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full mt-1 px-4 py-3 bg-neutral-900/90 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            <div className="flex flex-col relative">
              <label className="text-sm text-gray-300">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full mt-1 px-4 py-3 bg-neutral-900/90 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 w-6 h-6 flex items-center justify-center text-gray-300 cursor-pointer"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <label className="flex items-center text-gray-300 text-sm gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} /> Remember Me
            </label>

            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-400/30 rounded-lg p-2">{error}</p>}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-white flex justify-center items-center gap-2 disabled:opacity-50 transition"
            >
              {loading ? "Signing in..." : "Sign In"}
            </motion.button>

            <div className="flex justify-between text-sm mt-2 text-gray-300">
              <button type="button" onClick={() => window.open("https://discord.gg/nexusogfn", "_blank")} className="underline hover:text-white transition">Forgot Password?</button>
              <button type="button" onClick={() => window.open("https://discord.gg/nexusogfn", "_blank")} className="underline hover:text-white transition">Create Account</button>
            </div>
          </form>
        </motion.div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
