
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Product | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);

  const productRefs = useRef<Record<string, HTMLElement | null>>({});
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  // Load products from Supabase
  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        setError(
          "Products load nahi ho paaye. Please refresh karke try karein."
        );
      } else {
        setProducts((data || []) as Product[]);
      }

      setLoading(false);
    }

    loadProducts();
  }, []);

  // Open the correct product link by scrolling to and highlighting it
  useEffect(() => {
    if (loading || products.length === 0) return;

    const productId = new URLSearchParams(
      window.location.search
    ).get("product");

    if (!productId) return;

    const product = products.find((item) => item.id === productId);

    if (!product) return;

    setHighlightedProductId(productId);

    const timer = window.setTimeout(() => {
      productRefs.current[productId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);

    const highlightTimer = window.setTimeout(() => {
      setHighlightedProductId(null);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(highlightTimer);
    };
  }, [loading, products]);

  // Close enlarged image with Escape and lock background scrolling
  useEffect(() => {
    if (!selectedImage) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedImage]);

  // WhatsApp product enquiry
  function askForProduct(product: Product) {
    if (!whatsappNumber) {
      alert("WhatsApp number abhi set nahi hai.");
      return;
    }

    const productUrl =
      `${window.location.origin}/?product=${encodeURIComponent(product.id)}`;

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
    <main className="min-h-screen bg-[#f8f6f1] text-[#191919]">
      {/* Header and logo */}
      <header className="border-b border-black/10 px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3">
          {!logoFailed && (
            <img
              src="/logo.png"
              alt="SQVER CIRCLE STORE logo"
              onError={() => setLogoFailed(true)}
              className="h-12 w-12 object-contain"
            />
          )}

          <div className="text-center">
            <h1 className="text-lg font-bold tracking-[0.14em] sm:text-xl">
              SQVER CIRCLE STORE
            </h1>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-black/50">
              Fashion · Style · Everyday
            </p>
          </div>
        </div>
      </header>

      {/* Product collection */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Our Collection
            </h2>
            <p className="mt-1 text-sm text-black/55">
              Find your next favourite.
            </p>
          </div>

          <span className="text-xs text-black/50">
            {loading ? "Loading..." : `${products.length} products`}
          </span>
        </div>

        {loading && (
          <p className="py-16 text-center text-sm text-black/50">
            Products load ho rahe hain...
          </p>
        )}

        {!loading && error && (
          <p className="py-12 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="border border-black/10 bg-white px-4 py-12 text-center text-sm text-black/55">
            Abhi koi product available nahi hai.
          </p>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
            {products.map((product) => (
              <article
                key={product.id}
                ref={(element) => {
                  productRefs.current[product.id] = element;
                }}
                className={`min-w-0 rounded-xl p-2 transition-all duration-500 ${
                  highlightedProductId === product.id
                    ? "scale-[1.02] bg-white shadow-xl ring-2 ring-[#191919]"
                    : ""
                }`}
              >
                <div className="overflow-hidden rounded-lg bg-[#eeece6]">
                  {product.image_url ? (
                    <button
                      type="button"
                      onClick={() => setSelectedImage(product)}
                      aria-label={`View larger image of ${product.name}`}
                      className="group block w-full cursor-zoom-in"
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="aspect-[3/4] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 group-active:scale-100"
                      />
                    </button>
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center text-sm text-black/35">
                      Product Image
                    </div>
                  )}
                </div>

                <p className="mt-3 truncate text-sm font-medium">
                  {product.name}
                </p>

                <p className="mt-1 text-lg font-bold">
                  ₹{Number(product.price).toLocaleString("en-IN")}
                </p>

                <button
                  type="button"
                  onClick={() => askForProduct(product)}
                  className="mt-3 w-full rounded-md bg-[#191919] px-3 py-3 text-xs font-semibold text-white transition hover:bg-[#48443c]"
                >
                  Ask for This ↗
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-8 border-t border-black/10 px-4 py-6 text-center">
        <p className="text-xs font-semibold tracking-[0.15em]">
          SQVER CIRCLE STORE
        </p>
        <p className="mt-1 text-xs text-black/50">
          Thanks for visiting our store.
        </p>
      </footer>

      {/* Full-screen image zoom */}
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
          >
            ×
          </button>

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
              <p className="text-base font-semibold">
                {selectedImage.name}
              </p>

              <p className="mt-1 text-lg font-bold">
                ₹{Number(selectedImage.price).toLocaleString("en-IN")}
              </p>

              <p className="mt-2 text-xs text-white/50">
                Tap outside the image or × to close
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-\\[fadeIn_200ms_ease-out\\],
          .animate-\\[zoomIn_250ms_ease-out\\] {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
