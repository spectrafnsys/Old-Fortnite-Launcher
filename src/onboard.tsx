import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { readBinaryFile, exists } from "@tauri-apps/api/fs";
import { join } from "@tauri-apps/api/path";
import { appWindow } from "@tauri-apps/api/window";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Plus, Trash2, Settings, Home, Grid, LogOut,
  Minus, X, Award, Target, Trophy, BarChart2, ShoppingCart
} from "lucide-react";
import "./App.css";

const UPLOADED_HERO = "https://i.ibb.co/Nd04p2FW/fortnite-chapter-3-season-1-battle-pass-1900x600-2bd9f56f38e5.jpg";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    // using subarray to avoid huge apply on extremely large arrays
    binary += String.fromCharCode.apply(null as any, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

function getFolderName(p: string) {
  const parts = p.split(/\\|\//).filter(Boolean);
  return parts[parts.length - 1] || p;
}

type TabKey = "home" | "library" | "settings" | "shop";
type BuildItem = { id: string; path: string; name: string; coverDataUrl?: string };
type NewsItem = { id: string; title: string; date: string; desc: string; img?: string };
type ShopItem = { id: string; name: string; img: string | null };

export default function Onboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState<TabKey>("home");
  const [path, setPath] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [user, setUser] = useState<{ email: string; password: string } | null>(null);
  const [EOR, setEOR] = useState(false);
  const [builds, setBuilds] = useState<BuildItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [news] = useState<NewsItem[]>([
    { id: "n1", title: "Dive Into Chapter 3: Season 1", date: "Dec 1, 2021", desc: "Fortnite Chapter 3 Season 1 has arrived — new map, new mechanics, and endless possibilities. Get ready to drop.", img: "https://wallpapers.com/images/hd/fortnite-chapter-3-season-1-docjly1zx8gounqz.jpg" },
    { id: "n2", title: "Fresh Skins & Battle Pass", date: "Dec 3, 2021", desc: "Unlock the new Battle Pass skins, wraps and cosmetics — stand out this season in style.", img: "https://wallpapers.com/images/hd/fortnite-chapter-3-season-1-um3qdphf7be1yn20.jpg" },
    { id: "n3", title: "Explore the New Island", date: "Dec 5, 2021", desc: "From jungle to snow — Chapter 3 brings fresh POIs, new terrain and hidden loot. Explore it all!", img: "https://images.wallpapersden.com/image/download/fortnite-chapter-3-season-1_bWVuamqUmZqaraWkpJRobWllrWdma2U.jpg" },
  ]);

  const heroImage = UPLOADED_HERO;

  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
    } else {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(null);
        }
      }
    }

    const savedPath = localStorage.getItem("buildPath");
    if (savedPath) setPath(savedPath);

    const rawEOR = localStorage.getItem("EOR");
    if (rawEOR !== null) setEOR(rawEOR === "true");

    const savedBuilds = localStorage.getItem("PabloMP.builds");
    if (savedBuilds) {
      try {
        const parsed = JSON.parse(savedBuilds) as BuildItem[];
        setBuilds(parsed);
        if (!savedPath && parsed.length > 0) setPath(parsed[0].path);
      } catch {
        setBuilds([]);
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("PabloMP.builds", JSON.stringify(builds));
  }, [builds]);

  useEffect(() => {
    if (path) localStorage.setItem("buildPath", path);
    else localStorage.removeItem("buildPath");
  }, [path]);

  useEffect(() => {
    localStorage.setItem("EOR", String(EOR));
  }, [EOR]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const checkClient = async () => {
      try {
        const isRunning = await invoke("is_fortnite_client_running");
        if (!cancelled && !isRunning) setIsLaunching(false);
      } catch {
        if (!cancelled) setIsLaunching(false);
      }
    };

    if (isLaunching) {
      checkClient();
      intervalId = window.setInterval(checkClient, 3000) as unknown as number;
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [isLaunching]);

  const setErrorTimeout = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

const handleLaunch = async () => {
  setIsLaunching(true);

  const launchPath = path || builds[0]?.path;
  if (!launchPath) {
    setErrorTimeout("Please select a build.");
    setIsLaunching(false);
    return;
  }

  let currentUser = user ?? null;

  if (!currentUser?.email || !currentUser?.password) {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.email && parsed?.password) currentUser = parsed;
        else currentUser = null;
      } catch {
        currentUser = null;
      }
    }
  }

  if (!currentUser?.email || !currentUser?.password) {
    setErrorTimeout("No login details found.");
    setIsLaunching(false);
    return;
  }

  const email = currentUser.email;
  const password = currentUser.password;

  const eorRaw = localStorage.getItem("EOR");
  const eor = eorRaw === "true" || eorRaw === "1";

  try {
    await invoke("firstlaunch", {
      args: {
        path: launchPath,
        email,
        password,
        eor,
      }
    });
  } catch (err) {
    setErrorTimeout("Error launching: " + String(err));
    setIsLaunching(false);
    return;
  }

  setIsLaunching(false);
};

  const handleLogout = () => { localStorage.clear(); setUser(null); setPath(null); setBuilds([]); setEOR(false); navigate("/login"); };

  const addBuild = async () => {
    const selected = await open({ directory: true });
    if (!selected || typeof selected !== "string") return;
    try {
      const hasEngine = await exists(await join(selected, "Engine"));
      if (!hasEngine) { setErrorTimeout("Invalid build: missing Engine folder."); return; }
      const splashPath = await join(selected, "FortniteGame", "Content", "Splash", "Splash.bmp");
      const hasSplash = await exists(splashPath);
      let coverDataUrl: string | undefined;
      if (hasSplash) { const bytes = await readBinaryFile(splashPath); coverDataUrl = "data:image/bmp;base64," + bytesToBase64(new Uint8Array(bytes as any)); }
      const item: BuildItem = { id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8), path: selected, name: getFolderName(selected), coverDataUrl };
      setBuilds(prev => [item, ...prev]);
      setPath(selected);
    } catch (e) { setErrorTimeout("Could not add build: " + String(e)); }
  };

  const removeBuild = (id: string) => {
    setBuilds(prev => {
      const next = prev.filter(b => b.id !== id);
      if (path && prev.find(b => b.id === id)?.path === path) setPath(next[0]?.path ?? null);
      return next;
    });
  };

  function NavIconComp({ icon, value }: { icon: React.ReactNode; value: TabKey }) {
    return <button onClick={() => setActive(value)} className={`p-2 rounded-md transition-all ${active === value ? "bg-gradient-to-br from-amber-400/25 to-yellow-400/25 text-amber-300" : "text-gray-400 hover:text-white hover:bg-[#111]"}`}>{icon}</button>;
  }

  const HomePanel = () => {
    const current = builds.find(b => b.path === path) ?? builds[0];
    const hero = heroImage ?? current?.coverDataUrl ?? news[0]?.img;
    const [index, setIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const intervalRef = useRef<number | null>(null);

    const slideDurationMs = 5000;
    const tickMs = 100;
    const incrementPerTick = (tickMs / slideDurationMs) * 100;

    useEffect(() => { setProgress(0); }, [index]);

    useEffect(() => {
      if (paused) {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        setProgress(p => {
          const next = p + incrementPerTick;
          if (next >= 100) {
            setIndex(i => (i + 1) % news.length);
            return 0;
          }
          return next;
        });
      }, tickMs) as unknown as number;

      return () => {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [paused, index, news.length, incrementPerTick]);

    const stats = [
      { label: "Arena", value: 999, icon: <Award size={18} /> },
      { label: "Kills", value: 999, icon: <Target size={18} /> },
      { label: "Wins", value: 999, icon: <Trophy size={18} /> },
      { label: "K/D", value: 4.2, icon: <BarChart2 size={18} /> }
    ];

    const currentNews = news[index];

    const handleLaunchClick = async () => {
      // Use the centralized handleLaunch (handles auth + path fallback)
      if (!current) {
        setErrorTimeout("No build selected.");
        return;
      }
      if (!user && !localStorage.getItem("user")) {
        setErrorTimeout("No login details found.");
        return;
      }
      await handleLaunch();
    };

    return (
      <div className="flex flex-col md:flex-row gap-6 w-full select-none">
        <div className="flex-1 space-y-6">
          {user && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-[#0b0b0b]/80 border border-[#1b1b1b] rounded-lg shadow-md text-white">
              <div className="text-lg font-semibold">Welcome, <span className="text-amber-300">{user.email.split("@")[0]}</span>!</div>
              <div className="text-xs text-gray-400">Logged in as: {user.email}</div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#222]">
            {hero && <img src={hero} alt="cover" className="w-full h-72 object-cover brightness-90 contrast-105" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="absolute bottom-6 left-6 flex flex-col gap-2 pointer-events-auto">
              <div className="text-4xl font-bold text-white drop-shadow-xl">{current?.name ?? "No Build Selected"}</div>
              <div className="text-xs text-gray-300">{current?.path ?? "Select a build"}</div>
              <div className="mt-3 flex gap-3">
                <motion.button whileTap={{ scale: 0.96 }} onClick={handleLaunchClick} disabled={isLaunching || !current} className="px-8 py-2.5 font-semibold rounded-2xl shadow-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:opacity-95 flex items-center gap-2 text-black">
                  {isLaunching ? "Launching..." : <><Play size={16} /> Launch</>}
                </motion.button>
                <button onClick={() => setActive("library")} className="px-5 py-2.5 bg-[#0f0f0f]/60 text-gray-300 rounded-2xl hover:bg-[#171717]">View Library</button>
              </div>
            </div>
          </motion.div>

          <div className="relative w-full h-64 rounded-3xl overflow-hidden border border-[#222]/80 shadow-xl">
            <AnimatePresence mode="wait">
              <motion.img key={currentNews.id} src={currentNews.img} alt={currentNews.title} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.6 }} className="absolute inset-0 w-full h-full object-cover brightness-95 contrast-110" />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 pointer-events-none">
              <div className="text-xs text-gray-400">{currentNews.date}</div>
              <div className="text-2xl font-bold text-white leading-tight drop-shadow-lg mt-1">{currentNews.title}</div>
              <div className="text-sm text-gray-200 mt-2 max-w-prose line-clamp-2">{currentNews.desc}</div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-black/40">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-yellow-400" style={{ width: `${progress}%`, transition: `width ${tickMs}ms linear` }} />
            </div>
            <button onClick={() => setPaused(p => !p)} className="absolute top-3 right-3 px-2 py-1 rounded bg-black/40 hover:bg-black/60 text-white text-xs flex items-center gap-1">
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:w-44">
          {stats.map(s => (
            <button key={s.label} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#080808] to-[#111] text-white rounded-lg shadow-md">
              {s.icon}<span className="text-sm">{s.label}: <span className="text-amber-300 ml-1">{s.value}</span></span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const LibraryPanel = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-lg font-semibold text-white">Library</div>
          <div className="text-xs text-gray-400">Your installed builds</div>
        </div>

        <button
          onClick={addBuild}
          className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black text-sm hover:opacity-95 flex items-center gap-1"
        >
          <Plus size={14} /> Add Build
        </button>
      </div>

      {builds.length === 0 ? (
        <div className="p-6 bg-[#0b0b0b]/80 border border-[#222]/80 rounded text-gray-400 text-sm shadow-inner">
          No builds yet. Click “Add Build” to import a folder with an Engine.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {builds.map((b) => {
            const selected = b.path === path;

            return (
              <motion.div
                key={b.id}
                whileHover={{ scale: 1.03 }}
                className={`group rounded-lg overflow-hidden border transition-all shadow-sm hover:shadow-lg ${
                  selected ? "border-amber-400" : "border-[#1e1e1e]/80"
                } bg-[#0b0b0b]/70`}
              >
                {/* COVER */}
                <div className="h-40 bg-[#0b0b0b]/80 flex items-center justify-center overflow-hidden relative">
                  {b.coverDataUrl ? (
                    <img
                      src={b.coverDataUrl}
                      alt={b.name}
                      className="w-full h-full object-cover brightness-95 contrast-105 group-hover:scale-105 group-hover:brightness-[1.15] transition-all"
                    />
                  ) : (
                    <div className="text-xs text-gray-500">No cover</div>
                  )}

                  {/* EPIC-GAMES STYLE HOVER OVERLAY */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPath(b.path)}
                      className="px-3 py-1.5 rounded bg-[#111]/80 text-xs text-gray-200 hover:bg-[#1a1a1a]"
                    >
                      Select
                    </button>

                    <button
                      onClick={() => {
                        setPath(b.path);
                        handleLaunch();
                      }}
                      className="px-3 py-1.5 rounded bg-gradient-to-r from-amber-400 to-yellow-400 text-xs text-black font-medium"
                    >
                      Play
                    </button>
                  </div>
                </div>

                {/* INFO */}
                <div className="p-3">
                  <div className="text-sm font-medium text-white truncate">{b.name}</div>
                  <div className="text-xs text-gray-400 truncate">{getFolderName(b.path)}</div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setPath(b.path)}
                      className="px-3 py-1 rounded bg-[#0f0f0f]/60 text-xs hover:bg-[#171717]"
                    >
                      Select
                    </button>

                    <button
                      onClick={() => {
                        setPath(b.path);
                        handleLaunch();
                      }}
                      className="px-3 py-1 rounded bg-gradient-to-r from-amber-400 to-yellow-400 text-xs text-black"
                    >
                      Play
                    </button>

                    <button
                      onClick={() => removeBuild(b.id)}
                      className="px-2 py-1 rounded bg-[#2a0f0f]/80 text-xs text-gray-300 hover:bg-[#3a1515]/80"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  const ItemShopPanel = () => {
    const [featured, setFeatured] = useState<ShopItem[]>([]);
    const [daily, setDaily] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [shopError, setShopError] = useState<string | null>(null);

    useEffect(() => {
      const loadShop = async () => {
        try {
          const res = await fetch("https://fortnite-api.com/v2/shop/br");
          if (!res.ok) throw new Error("No current Itemshop.");

          const data = await res.json();

          const parseItems = (items: any[]): ShopItem[] =>
            items
              .map((entry) => {
                const item = entry.items?.[0];
                if (!item) return null;
                const img =
                  item.images?.featured ||
                  item.images?.icon ||
                  item.images?.background ||
                  null;
                return { id: entry.offerId || item.id, name: item.name, img };
              })
              .filter(Boolean) as ShopItem[];

          setFeatured(parseItems(data.data.shop?.featured || []));
          setDaily(parseItems(data.data.shop?.daily || []));
        } catch (err) {
          console.error(err);
          setShopError("No current Itemshop.");
        } finally {
          setLoading(false);
        }
      };

      loadShop();
    }, []);

    const Section = ({ title, items }: { title: string; items: ShopItem[] }) => (
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            marginBottom: "0.75rem",
            color: "#fff",
          }}
        >
          {title}
        </div>
        {items.length === 0 ? (
          <div style={{ color: "#aaa", fontSize: "0.875rem" }}>No items found.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "0.5rem",
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "rgba(11,11,11,0.7)",
                  border: "1px solid rgba(34,34,34,0.8)",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  textAlign: "center",
                  padding: "0.5rem",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div
                  style={{
                    height: "160px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  {item.img ? (
                    <img
                      src={item.img}
                      alt={item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ color: "#888", fontSize: "0.75rem" }}>No Image</div>
                  )}
                </div>
                <div style={{ color: "#fff", fontSize: "0.875rem" }}>{item.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    if (loading) return <div style={{ color: "#aaa" }}>Loading Item Shop…</div>;
    if (shopError) return <div style={{ color: "#f00" }}>{shopError}</div>;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <Section title="Featured" items={featured} />
        <Section title="Daily" items={daily} />
      </div>
    );
  };

  const SettingsPanel = () => {
    const version = "Download";
    const downloadUrl = "https://cdn.fortnitearchive.com/Fortnite%2012.41.zip";

    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isCanceled, setIsCanceled] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [downloaded, setDownloaded] = React.useState(0);
    const [total, setTotal] = React.useState(0);
    const [speed, setSpeed] = React.useState(0);
    const [timeLeft, setTimeLeft] = React.useState(0);
    const [buffers, setBuffers] = React.useState<Uint8Array[]>([]);
    const abortController = React.useRef<AbortController | null>(null);
    const [toast, setToast] = React.useState("");
    const [showAbout, setShowAbout] = React.useState(false);

    function formatBytes(bytes: number): string {
      if (!bytes) return "0 MB";
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
    }

    function showToast(msg: string) {
      setToast(msg);
      setTimeout(() => setToast(""), 2000);
    }

    async function startDownload(resume = false) {
      setIsDownloading(true);
      setIsCanceled(false);

      const startTime = Date.now();
      abortController.current = new AbortController();

      const headers: any = {};
      if (resume && downloaded > 0) {
        headers.Range = `bytes=${downloaded}-`;
      }

      const response = await fetch(downloadUrl, {
        signal: abortController.current.signal,
        headers,
      });

      const contentLength = response.headers.get("Content-Length");
      const totalBytes = resume
        ? downloaded + Number(contentLength)
        : Number(contentLength);
      setTotal(totalBytes);

      const reader = response.body?.getReader();
      if (!reader) {
        alert("Unable to read file stream.");
        setIsDownloading(false);
        return;
      }

      let received = resume ? downloaded : 0;
      let newBuffers: Uint8Array[] = resume ? [...buffers] : [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          newBuffers.push(value);
          received += value.length;

          setDownloaded(received);
          setProgress(Number(((received / totalBytes) * 100).toFixed(1)));

          const elapsedSec = (Date.now() - startTime) / 1000;
          const bytesPerSec = (received - (resume ? downloaded : 0)) / Math.max(elapsedSec, 0.001);
          setSpeed(bytesPerSec);
          setTimeLeft((totalBytes - received) / Math.max(bytesPerSec, 0.001));
        }
      } catch (e: any) {
        if (isCanceled) {
          showToast("Download canceled");
          setIsDownloading(false);
          return;
        }
        console.error(e);
      }

      setBuffers(newBuffers);

      if (!isCanceled) {
        const blob = new Blob(newBuffers.map((b) => new Uint8Array(b)));
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Fortnite_12.41.zip";
        link.click();

        showToast("Download complete");
      }

      setIsDownloading(false);
    }

    function cancelDownload() {
      if (abortController.current) abortController.current.abort();
      setIsCanceled(true);
      setIsDownloading(false);

      setTimeout(() => {
        setProgress(0);
        setDownloaded(0);
        setTotal(0);
        setSpeed(0);
        setTimeLeft(0);
        setBuffers([]);
      }, 300);

      showToast("Download canceled");
    }

    return (
      <div className="relative w-full h-full p-6">

        {/* Toast */}
        {toast && (
          <div className="fixed top-5 right-5 bg-black/80 text-white px-4 py-2 rounded-xl transition-opacity duration-300">
            {toast}
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Download Panel */}
          <div className="p-5 bg-[#0b0b0b]/90 border border-[#222]/80 rounded-xl shadow-md hover:shadow-lg transition-shadow">

            <div className={`${isCanceled ? "opacity-0 transition-opacity duration-300" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-400 font-bold text-lg">Download 12.41</span>

                {isDownloading && (
                  <button
                    onClick={cancelDownload}
                    className="text-red-500 hover:text-red-700 text-xl font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="text-sm text-gray-400 mb-3">Build version available</div>

              {!isDownloading && progress === 0 && (
                <button
                  onClick={() => startDownload(false)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-semibold rounded-xl inline-block hover:opacity-95 transition"
                >
                  {version}
                </button>
              )}

              {!isDownloading && progress > 0 && !isCanceled && (
                <button
                  onClick={() => startDownload(true)}
                  className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition"
                >
                  Resume Download
                </button>
              )}

              {(isDownloading || progress > 0) && (
                <div className="mt-4">
                  <div className="text-sm text-gray-300 mb-1">
                    {progress}% — {formatBytes(downloaded)} / {formatBytes(total)}
                  </div>

                  <progress value={progress} max={100} className="w-full h-3 rounded" />

                  <div className="text-xs text-gray-400 mt-2">
                    Speed: {formatBytes(speed)}/s <br />
                    Time left: {Math.round(timeLeft)}s
                  </div>

                  {isDownloading && (
                    <button
                      onClick={cancelDownload}
                      className="mt-3 px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition"
                    >
                      ✕ Cancel Download
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Panel */}
          <div className="p-5 bg-[#0b0b0b]/90 border border-[#222]/80 rounded-xl shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between">
            <div>
              <div className="font-bold text-sm text-white mb-2">Account</div>
              <div className="text-xs text-gray-400 mb-1">Signed in as:</div>
              <div className="text-sm text-white">{user?.email ?? "–"}</div>
            </div>
          </div>

        </div>

        {/* Info Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowAbout(!showAbout)}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-black rounded-xl hover:opacity-95 transition w-full md:w-auto text-center"
            style={{ fontFamily: '"Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif' }}
          >
            Information about Launcher
          </button>
        </div>

        {/* About Launcher Info Panel */}
        {showAbout && (
          <div className="mt-4 p-5 bg-[#111]/90 text-white rounded-xl border border-[#333]/80 w-full">
            <div className="font-bold text-lg mb-2">
              Launcher Information
            </div>
            <div className="text-sm text-gray-300">
              Made by Secret_pabloback on Discord
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="fixed bottom-4 right-4 px-4 py-2 rounded-2xl bg-red-600 text-white font-semibold shadow-lg hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen min-w-[1300px] min-h-[800px] bg-gradient-to-br from-[#020204] via-[#071019] to-[#0f0b04] text-white font-sans relative overflow-hidden">
      {/* decorative subtle particles */}
      {[...Array(16)].map((_, i) => (
        <motion.div key={i} animate={{ y: [0, 8, 0], x: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 10 + i }} className="absolute w-1 h-1 bg-yellow-400/20 rounded-full" style={{ top: `${(i * 7) % 100}%`, left: `${(i * 13) % 100}%` }} />
      ))}

      {/* Sidebar */}
      <div className="w-20 bg-[#060606]/95 border-r border-[#151515] flex flex-col justify-between py-4">
        <div className="flex flex-col items-center gap-6">
          <img src="https://i.ibb.co/wF5sQDN2/nexus.png" alt="Logo" className="w-12 h-12 object-cover rounded-full ring-1 ring-amber-400/30" />
          <NavIconComp icon={<Home size={20} />} value="home" />
          <NavIconComp icon={<Grid size={20} />} value="library" />
          <NavIconComp icon={<ShoppingCart size={20} />} value="shop" />
          <NavIconComp icon={<Settings size={20} />} value="settings" />
        </div>
        <button onClick={handleLogout} className="flex items-center justify-center w-full py-2 text-gray-500 hover:text-yellow-400"><LogOut size={18} /></button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        <div data-tauri-drag-region className="flex items-center justify-between px-4 py-2 bg-[#070707]/80 border-b border-[#151515]">
          <div className="text-sm text-gray-400 select-none">Nexus - Chapter 1 Season 4</div>
          <div className="flex items-center gap-3">
            <button onClick={() => appWindow.minimize()} className="hover:text-yellow-400 text-gray-400"><Minus size={14} /></button>
            <button onClick={() => appWindow.close()} className="hover:text-red-500 text-gray-400"><X size={14} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {active === "home" && <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><HomePanel /></motion.div>}
            {active === "library" && <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LibraryPanel /></motion.div>}
            {active === "shop" && <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ItemShopPanel /></motion.div>}
            {active === "settings" && <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><SettingsPanel /></motion.div>}
          </AnimatePresence>
          {error && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 rounded shadow-lg text-white text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
}
