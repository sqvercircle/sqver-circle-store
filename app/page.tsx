"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
};

type SortMode = "newest" | "price-low" | "price-high" | "name";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Product | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const productRefs = useRef<Record<string, HTMLElement | null>>({});
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        setError("Products load nahi ho paaye. Please refresh karke try karein.");
      } else {
        setProducts((data || []) as Product[]);
      }
      setLoading(false);
    }
    loadProducts();
  }, []);

  useEffect(() => {
    if (loading || products.length === 0) return;
    const productId = new URLSearchParams(window.location.search).get("product");
    if (!productId) return;
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    setHighlightedProductId(productId);
    const timer = window.setTimeout(() => {
      productRefs.current[productId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    const highlightTimer = window.setTimeout(() => setHighlightedProductId(null), 5000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(highlightTimer);
    };
  }, [loading, products]);

  useEffect(() => {
    if (!selectedImage) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedImage(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedImage]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(normalizedSearch)
    );
    return [...filtered].sort((a, b) => {
      if (sortMode === "price-low") return Number(a.price) - Number(b.price);
      if (sortMode === "price-high") return Number(b.price) - Number(a.price);
      if (sortMode === "name") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [products, search, sortMode]);

  function askForProduct(product: Product) {
    if (!whatsappNumber) {
      alert("WhatsApp number abhi set nahi hai.");
      return;
    }
    const productUrl = `${window.location.origin}/?product=${encodeURIComponent(product.id)}`;
    const message = `Hi SQVER CIRCLE STORE! 👋

I am interested in this product:

Product: ${product.name}
Price: ₹${Number(product.price).toLocaleString("en-IN")}
Product Link: ${productUrl}

Please share more details about this product. Thank you!`;

    window.open(
      `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f5f0] text-[#171714]">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f7f5f0]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <a href="/" aria-label="SQVER CIRCLE STORE home" className="flex min-w-0 items-center gap-3">
            {!logoFailed && (
              <img
                src="/logo.png"
                alt="SQVER CIRCLE STORE logo"
                onError={() => setLogoFailed(true)}
                className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-[0.13em] sm:text-base">SQVER CIRCLE STORE</p>
            </div>
          </a>

        </div>
      </header>

      <section id="collection" className="scroll-mt-24 border-t border-black/10 bg-[#efede7]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">Available Products</h2>
            </div>
            <p className="text-xs text-black/50">{loading ? "Loading styles…" : `${products.length} ${products.length === 1 ? "style" : "styles"} available`}</p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
            <label className="relative block flex-1">
              <span className="sr-only">Search products</span>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-black/40">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by product name…"
                className="w-full rounded-full border border-black/15 bg-[#f9f8f4] py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-black/35 focus:border-black/50"
              />
            </label>
            <label className="sm:w-56">
              <span className="sr-only">Sort products</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="w-full rounded-full border border-black/15 bg-[#f9f8f4] px-4 py-3.5 text-sm outline-none transition focus:border-black/50"
              >
                <option value="newest">Sort: Recently added</option>
                <option value="price-low">Price: Low to high</option>
                <option value="price-high">Price: High to low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </label>
          </div>

          {loading && (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[3/4] rounded-2xl bg-black/5" />
                  <div className="mt-4 h-3 w-3/4 rounded bg-black/10" />
                  <div className="mt-3 h-4 w-1/3 rounded bg-black/10" />
                  <div className="mt-4 h-10 rounded-full bg-black/10" />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-white p-8 text-center text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="mt-8 rounded-2xl border border-black/10 bg-[#f9f8f4] px-4 py-16 text-center">
              <p className="font-serif text-2xl italic">A new collection is on its way.</p>
              <p className="mt-2 text-sm text-black/50">Abhi koi product available nahi hai.</p>
            </div>
          )}

          {!loading && !error && products.length > 0 && visibleProducts.length === 0 && (
            <div className="mt-8 rounded-2xl border border-black/10 bg-[#f9f8f4] px-4 py-16 text-center">
              <p className="text-lg font-semibold">No matching styles found</p>
              <p className="mt-2 text-sm text-black/50">Try another product name.</p>
              <button type="button" onClick={() => setSearch("")} className="mt-4 rounded-full border border-black/20 px-5 py-2.5 text-xs font-bold uppercase tracking-wider">Clear search</button>
            </div>
          )}

          {!loading && !error && visibleProducts.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:mt-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
              {visibleProducts.map((product) => (
                <article
                  key={product.id}
                  ref={(element) => { productRefs.current[product.id] = element; }}
                  className={`group min-w-0 transition-all duration-500 ${highlightedProductId === product.id ? "scale-[1.02] rounded-2xl bg-white p-2 shadow-xl ring-2 ring-[#887a64]" : ""}`}
                >
                  <div className="relative overflow-hidden rounded-2xl bg-[#e5e1d8]">
                    {product.image_url ? (
                      <button
                        type="button"
                        onClick={() => setSelectedImage(product)}
                        aria-label={`View larger image of ${product.name}`}
                        className="group/image block w-full cursor-zoom-in"
                      >
                        <img
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                          className="aspect-[3/4] w-full object-cover transition duration-700 ease-out group-hover/image:scale-[1.04]"
                        />
                      </button>
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center text-xs uppercase tracking-widest text-black/35">Image coming soon</div>
                    )}
                    <button
                      type="button"
                      onClick={() => askForProduct(product)}
                      className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#171714] text-lg text-white shadow-lg transition hover:scale-105 hover:bg-[#49463e]"
                      aria-label={`Ask about ${product.name} on WhatsApp`}
                    >
                      ↗
                    </button>
                  </div>
                  <div className="px-0.5 pt-3">
                    <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 sm:text-base">{product.name}</p>
                    <p className="mt-2 text-base font-bold tracking-tight sm:text-lg">₹{Number(product.price).toLocaleString("en-IN")}</p>
                    <button
                      type="button"
                      onClick={() => askForProduct(product)}
                      className="mt-3 w-full rounded-full border border-black/20 bg-transparent px-3 py-3 text-[9px] font-bold uppercase tracking-[0.12em] transition hover:border-[#171714] hover:bg-[#171714] hover:text-white sm:text-[10px]"
                    >
                      Ask on WhatsApp <span className="ml-1">↗</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-black/10 px-4 py-6 text-center text-[10px] tracking-[0.12em] text-black/45">
        SQVER CIRCLE STORE · © 2026
      </footer>

      {selectedImage?.image_url && (
        <div
          className="fixed inset-0 z-50 flex animate-[fadeIn_200ms_ease-out] items-center justify-center bg-black/95 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Large image of ${selectedImage.name}`}
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="Close enlarged image"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white transition hover:bg-white/25"
          >×</button>
          <div
            className="flex max-h-full max-w-5xl animate-[zoomIn_250ms_ease-out] flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={selectedImage.image_url}
              alt={selectedImage.name}
              className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl sm:max-h-[80vh]"
            />
            <div className="mt-4 text-center text-white">
              <p className="text-base font-semibold">{selectedImage.name}</p>
              <p className="mt-1 text-lg font-bold">₹{Number(selectedImage.price).toLocaleString("en-IN")}</p>
              <button
                type="button"
                onClick={() => askForProduct(selectedImage)}
                className="mt-3 rounded-full bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-white/80"
              >Ask about this product ↗</button>
              <p className="mt-2 text-[10px] text-white/45">Tap outside the image or × to close</p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[fadeIn_200ms_ease-out\\], .animate-\\[zoomIn_250ms_ease-out\\] { animation: none; }
          * { scroll-behavior: auto !important; }
        }
      `}</style>
    </main>
  );
}
