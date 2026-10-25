
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "hidden">("all");

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, image_url, is_active")
      .order("created_at", { ascending: false });

    if (error) {
      setError(`Products load nahi hue: ${error.message}`);
      return;
    }

    setProducts((data || []) as Product[]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError || !admin) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      if (!cancelled) {
        await loadProducts();
        if (!cancelled) setChecking(false);
      }
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [router, loadProducts]);

  function resetForm() {
    setName("");
    setPrice("");
    setImage(null);
    setEditingId(null);
    setMessage("");
    setError("");

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  function startEditing(product: Product) {
    setEditingId(product.id);
    setName(product.name);
    setPrice(String(product.price));
    setImage(null);
    setMessage("");
    setError("");

    if (fileInput.current) {
      fileInput.current.value = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addOrUpdateProduct(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setError("");

    const numericPrice = Number(price);

    if (!name.trim()) {
      setError("Product ka naam daalo.");
      return;
    }

    if (
      price.trim() === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      setError("Sahi product price daalo.");
      return;
    }

    if (!editingId && !image) {
      setError("Naye product ki image select karo.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl: string | null = null;

      if (image) {
        const extension =
          image.name.split(".").pop()?.toLowerCase() || "jpg";

        const filePath = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, image, {
            upsert: false,
            contentType: image.type || undefined,
          });

        if (uploadError) {
          setError(`Image upload nahi hui: ${uploadError.message}`);
          return;
        }

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      if (editingId) {
        const changes: {
          name: string;
          price: number;
          image_url?: string;
        } = {
          name: name.trim(),
          price: numericPrice,
        };

        if (imageUrl) {
          changes.image_url = imageUrl;
        }

        const { error: updateError } = await supabase
          .from("products")
          .update(changes)
          .eq("id", editingId);

        if (updateError) {
          setError(`Product update nahi hua: ${updateError.message}`);
          return;
        }

        setMessage("Product successfully update ho gaya!");
      } else {
        const { error: insertError } = await supabase
          .from("products")
          .insert({
            name: name.trim(),
            price: numericPrice,
            image_url: imageUrl,
            is_active: true,
          });

        if (insertError) {
          setError(`Product save nahi hua: ${insertError.message}`);
          return;
        }

        setMessage("Naya product successfully add ho gaya!");
      }

      await loadProducts();
      setName("");
      setPrice("");
      setImage(null);
      setEditingId(null);

      if (fileInput.current) {
        fileInput.current.value = "";
      }
    } catch {
      setError("Kuch problem hui. Dobara try karo.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product: Product) {
    setMessage("");
    setError("");

    const { error: updateError } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);

    if (updateError) {
      setError(`Status change nahi hua: ${updateError.message}`);
      return;
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? { ...item, is_active: !item.is_active }
          : item
      )
    );

    setMessage(
      product.is_active
        ? "Product website se hide kar diya!"
        : "Product website par show kar diya!"
    );
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `"${product.name}" ko permanently delete karna hai? Ye action undo nahi hoga.`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (deleteError) {
      setError(`Product delete nahi hua: ${deleteError.message}`);
      return;
    }

    setProducts((current) =>
      current.filter((item) => item.id !== product.id)
    );

    if (editingId === product.id) {
      resetForm();
    }

    setMessage("Product delete ho gaya!");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const activeCount = products.filter((product) => product.is_active).length;
  const hiddenCount = products.length - activeCount;
  const visibleProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter = filter === "all" || (filter === "active" ? product.is_active : !product.is_active);
    return matchesSearch && matchesFilter;
  });

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1eb] px-4 text-sm text-[#777168]">
        <div className="flex items-center gap-3 rounded-2xl border border-[#e7e1d7] bg-white px-5 py-4 shadow-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#9a805c]" />
          Admin access check ho raha hai...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#201f1c]">
      <header className="border-b border-white/10 bg-[#201f1c] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-sm font-black tracking-tight">SC</div>
            <div>
              <h1 className="text-sm font-bold tracking-[0.2em] sm:text-base">SQVER CIRCLE</h1>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/55">Store management</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-white/25 px-4 py-2.5 text-xs font-semibold transition hover:bg-white hover:text-[#201f1c] sm:text-sm"
          >
            Log out ↗
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-10 lg:px-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#927b5d]">Your workspace</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#777168]">Apne store ke products, prices aur website visibility yahan se manage karo.</p>
          </div>
          <div className="rounded-2xl border border-[#e5ded2] bg-white px-4 py-3 text-sm shadow-sm">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium">Admin panel active</span>
          </div>
        </div>

        <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-[#e6dfd4] bg-white p-5 shadow-[0_4px_20px_rgba(42,35,25,0.03)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#898174]">Total products</p>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-tight">{products.length}</p>
              <span className="rounded-lg bg-[#f4f1eb] px-3 py-2 text-xs text-[#756a5a]">In catalog</span>
            </div>
          </div>
          <div className="rounded-2xl border border-[#e6dfd4] bg-white p-5 shadow-[0_4px_20px_rgba(42,35,25,0.03)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#898174]">Visible online</p>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-tight">{activeCount}</p>
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">Shown on site</span>
            </div>
          </div>
          <div className="rounded-2xl border border-[#e6dfd4] bg-white p-5 shadow-[0_4px_20px_rgba(42,35,25,0.03)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#898174]">Hidden products</p>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-tight">{hiddenCount}</p>
              <span className="rounded-lg bg-[#f4f1eb] px-3 py-2 text-xs text-[#756a5a]">Not shown</span>
            </div>
          </div>
        </section>

        {(message || error) && (
          <div className="mb-6 space-y-2">
            {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ {message}</p>}
            {error && <p role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[350px_minmax(0,1fr)] xl:gap-8">
          <section className="overflow-hidden rounded-2xl border border-[#e5ded2] bg-white shadow-[0_8px_30px_rgba(42,35,25,0.04)] lg:sticky lg:top-6">
            <div className="bg-[#eae3d7] px-5 py-5 sm:px-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#87745a]">Product details</p>
              <h3 className="mt-2 text-xl font-semibold">{editingId ? "Edit product" : "Add a product"}</h3>
              <p className="mt-1 text-sm text-[#746d62]">Naam, price aur photo update karo.</p>
            </div>

            <form key={editingId || "new-product"} onSubmit={addOrUpdateProduct} className="space-y-5 p-5 sm:p-6">
              <div>
                <label htmlFor="product-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#6d665c]">Product name</label>
                <input id="product-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Classic Black Shirt" required className="w-full rounded-xl border border-[#ded8ce] bg-[#fcfbf9] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#aaa398] focus:border-[#8f795c] focus:bg-white focus:ring-4 focus:ring-[#b7a487]/15" />
              </div>
              <div>
                <label htmlFor="product-price" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#6d665c]">Price (₹)</label>
                <div className="flex items-center rounded-xl border border-[#ded8ce] bg-[#fcfbf9] focus-within:border-[#8f795c] focus-within:ring-4 focus-within:ring-[#b7a487]/15">
                  <span className="border-r border-[#e8e2d9] px-3.5 py-3 text-sm text-[#81796d]">₹</span>
                  <input id="product-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="499" required className="w-full rounded-r-xl bg-transparent px-3 py-3 text-sm outline-none placeholder:text-[#aaa398]" />
                </div>
              </div>
              <div>
                <label htmlFor="product-image" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#6d665c]">{editingId ? "Replace photo (optional)" : "Product photo"}</label>
                <input ref={fileInput} id="product-image" type="file" accept="image/*" required={!editingId} onChange={(event) => setImage(event.target.files?.[0] || null)} className="w-full rounded-xl border border-dashed border-[#d5ccbd] bg-[#fcfbf9] p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#eae3d7] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#514738] hover:border-[#9b8668]" />
                {editingId && <p className="mt-2 text-xs leading-5 text-[#898174]">Nayi photo select nahi karoge toh purani photo rahegi.</p>}
                {image && <p className="mt-2 break-all rounded-lg bg-[#f4f1eb] px-3 py-2 text-xs text-[#756a5a]">Selected: {image.name}</p>}
              </div>
              <button type="submit" disabled={saving} className="w-full rounded-xl bg-[#201f1c] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#49443a] disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? "Saving product…" : editingId ? "Save changes  →" : "+  Add product"}
              </button>
              {editingId && <button type="button" onClick={resetForm} className="w-full rounded-xl border border-[#ded8ce] px-4 py-3 text-sm font-semibold text-[#625b51] transition hover:bg-[#f7f4ef]">Cancel editing</button>}
              <p className="text-center text-[11px] leading-5 text-[#9a9286]">Changes are saved to your store catalog.</p>
            </form>
          </section>

          <section className="min-w-0">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#927b5d]">Catalog</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight">Your products <span className="text-[#9b9285]">({products.length})</span></h3>
                <p className="mt-1 text-sm text-[#777168]">Edit details or control what customers can see.</p>
              </div>
              <div className="flex flex-col gap-2 sm:w-64">
                <label htmlFor="product-search" className="sr-only">Search products</label>
                <input id="product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="⌕  Search products..." className="w-full rounded-xl border border-[#e1d9cd] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#a39a8d] focus:border-[#9b8668] focus:ring-4 focus:ring-[#b7a487]/15" />
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {([ ["all", "All products", products.length], ["active", "Visible", activeCount], ["hidden", "Hidden", hiddenCount] ] as const).map(([value, label, count]) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${filter === value ? "bg-[#201f1c] text-white shadow-sm" : "border border-[#e1d9cd] bg-white text-[#756d62] hover:border-[#b7a487]"}`}>
                  {label} <span className={filter === value ? "ml-1 text-white/65" : "ml-1 text-[#a39a8d]"}>{count}</span>
                </button>
              ))}
            </div>

            {visibleProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9d0c3] bg-white px-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f1eb] text-2xl">⌕</div>
                <p className="mt-4 font-semibold">{products.length === 0 ? "Your catalog is empty" : "No matching products"}</p>
                <p className="mt-1 text-sm text-[#898174]">{products.length === 0 ? "Apna pehla product add karne ke liye form bharo." : "Search ya filter change karke dobara dekho."}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <article key={product.id} className="group overflow-hidden rounded-2xl border border-[#e5ded2] bg-white shadow-[0_4px_18px_rgba(42,35,25,0.025)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(42,35,25,0.08)]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#ece7df]">
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-sm text-[#9a9286]">No product photo</div>}
                      <span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] backdrop-blur ${product.is_active ? "bg-emerald-50/95 text-emerald-800" : "bg-white/90 text-[#777168]"}`}>
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${product.is_active ? "bg-emerald-500" : "bg-[#aaa398]"}`} />
                        {product.is_active ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <div className="p-4">
                      <h4 className="min-h-10 break-words text-sm font-semibold leading-5">{product.name}</h4>
                      <p className="mt-2 text-xl font-semibold tracking-tight">₹{Number(product.price).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="grid grid-cols-3 border-t border-[#eee8df]">
                      <button type="button" onClick={() => startEditing(product)} className="border-r border-[#eee8df] px-2 py-3 text-xs font-semibold text-[#5f574b] transition hover:bg-[#f4f1eb]">Edit</button>
                      <button type="button" onClick={() => toggleProduct(product)} className="border-r border-[#eee8df] px-2 py-3 text-xs font-semibold text-[#5f574b] transition hover:bg-[#f4f1eb]">{product.is_active ? "Hide" : "Show"}</button>
                      <button type="button" onClick={() => deleteProduct(product)} className="px-2 py-3 text-xs font-semibold text-red-600 transition hover:bg-red-50">Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className="mt-5 text-center text-[11px] text-[#a39a8d]">Showing {visibleProducts.length} of {products.length} products</p>
          </section>
        </div>
      </div>
    </main>
  );
}
