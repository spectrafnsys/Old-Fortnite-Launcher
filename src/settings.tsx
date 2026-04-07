import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";

// --- Toggle Component ---
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 ${
          checked ? "bg-blue-500" : "bg-gray-700"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-300 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

// --- Settings Section ---
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5 flex flex-col gap-3">
      <h3 className="text-gray-200 font-semibold text-sm">{title}</h3>
      {children}
    </div>
  );
}

// --- Main Settings Component ---
export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email: string; password: string } | null>(null);
  const [EOR, setEOR] = useState<boolean>(false);
  const [autoLaunch, setAutoLaunch] = useState<boolean>(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }

    const savedEOR = localStorage.getItem("EOR");
    if (savedEOR !== null) setEOR(savedEOR === "true");

    const savedAuto = localStorage.getItem("autoLaunchEnabled");
    if (savedAuto !== null) setAutoLaunch(savedAuto === "true");
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate("/login");
  };

  const handleMinimize = () => invoke("window_minimize");
  const handleClose = () => invoke("window_close");

  const handleToggleEOR = (next: boolean) => {
    setEOR(next);
    localStorage.setItem("EOR", String(next));
  };

  const handleToggleAutoLaunch = (next: boolean) => {
    setAutoLaunch(next);
    localStorage.setItem("autoLaunchEnabled", String(next));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-gray-100 overflow-hidden">
      {/* Topbar */}
      <div className="flex justify-end p-3 bg-black/40 backdrop-blur-md">
        <button
          onClick={handleMinimize}
          className="h-8 w-8 rounded hover:bg-white/10 grid place-items-center"
        >
          <span className="block w-4 h-0.5 bg-gray-200"></span>
        </button>
        <button
          onClick={handleClose}
          className="ml-2 h-8 w-8 rounded hover:bg-white/10 grid place-items-center"
        >
          <span className="block w-4 h-0.5 rotate-45 bg-gray-200"></span>
          <span className="block w-4 h-0.5 -rotate-45 bg-gray-200 -mt-0.5"></span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Settings Section */}
          <Section title="Game Settings">
            <Toggle
              checked={EOR}
              onChange={handleToggleEOR}
              label="Edit / Reset on release"
              description="Automatically reset edits when a new release is detected"
            />
            <Toggle
              checked={autoLaunch}
              onChange={handleToggleAutoLaunch}
              label="Auto Launch"
              description="Launch game automatically when ready"
            />
          </Section>

          {/* Account Section */}
          <Section title="Account">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Signed in as</span>
                <span className="text-gray-100 text-sm">{user?.email ?? "–"}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-red-500 to-yellow-600 hover:from-yellow-500 hover:to-red-700 transition"
              >
                Logout
              </motion.button>
            </div>
          </Section>

          {/* Misc Section */}
          <Section title="Miscellaneous">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => window.open("https://discord.com", "_blank")}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-500 hover:from-blue-500 hover:to-purple-600 transition"
            >
              Support / Donate
            </motion.button>
          </Section>
        </div>
      </div>
    </div>
  );
}