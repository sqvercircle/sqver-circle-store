
"use client";

import { useEffect, useState } from "react";
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

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

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

  function askForProduct(product: Product) {
    if (!whatsappNumber) {
      alert("WhatsApp number abhi set nahi hai.");
      return;
    }

    const message = `Hi SQVER CIRCLE STORE, I am interested in ${product.name}, priced at ₹${product.price}. Please share more details.`;

    window.open(
      `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#191919]">
      {/* Store branding */}
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

      {/* Products */}
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
              <article key={product.id} className="min-w-0">
                <div className="overflow-hidden rounded-lg bg-[#eeece6]">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                      className="aspect-[3/4] w-full object-cover transition duration-300 hover:scale-[1.03]"
                    />
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

      {/* Simple footer branding */}
      <footer className="mt-8 border-t border-black/10 px-4 py-6 text-center">
        <p className="text-xs font-semibold tracking-[0.15em]">
          SQVER CIRCLE STORE
        </p>
        <p className="mt-1 text-xs text-black/50">
          Thanks for visiting our store.
        </p>
      </footer>
    </main>
  );
}
