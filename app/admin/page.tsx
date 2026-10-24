
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

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f6f1] text-sm text-black/60">
        Admin access check ho raha hai...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#191919]">
      <header className="border-b border-black/10 bg-white px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-[0.1em]">
              SQVER CIRCLE
            </h1>
            <p className="mt-1 text-xs text-black/50">
              Store Admin Panel
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[380px_1fr]">
        <section className="h-fit rounded-xl border border-black/10 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-semibold">
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>

          <p className="mt-1 text-sm text-black/50">
            Product details aur photo manage karo.
          </p>

          <form
            key={editingId || "new-product"}
            onSubmit={addOrUpdateProduct}
            className="mt-6 space-y-5"
          >
            <div>
              <label
                htmlFor="product-name"
                className="mb-2 block text-sm font-medium"
              >
                Product Name
              </label>
              <input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Classic Black Shirt"
                required
                className="w-full rounded-lg border border-black/15 px-3 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label
                htmlFor="product-price"
                className="mb-2 block text-sm font-medium"
              >
                Price (₹)
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="499"
                required
                className="w-full rounded-lg border border-black/15 px-3 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label
                htmlFor="product-image"
                className="mb-2 block text-sm font-medium"
              >
                {editingId
                  ? "Change Image (optional)"
                  : "Product Image"}
              </label>
              <input
                ref={fileInput}
                id="product-image"
                type="file"
                accept="image/*"
                required={!editingId}
                onChange={(event) =>
                  setImage(event.target.files?.[0] || null)
                }
                className="w-full rounded-lg border border-black/15 p-3 text-sm"
              />
              {editingId && (
                <p className="mt-2 text-xs text-black/50">
                  Nayi image select nahi karoge toh purani image rahegi.
                </p>
              )}
              {image && (
                <p className="mt-2 break-all text-xs text-black/50">
                  Selected: {image.name}
                </p>
              )}
            </div>

            {message && (
              <p
                role="status"
                className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
              >
                {message}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="break-words rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[#191919] px-4 py-3.5 text-sm font-semibold text-white hover:bg-[#48443c] disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Add Product"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-lg border border-black/20 px-4 py-3 text-sm font-medium hover:bg-black/5"
              >
                Cancel Editing
              </button>
            )}
          </form>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Your Products</h2>
              <p className="mt-1 text-sm text-black/50">
                Edit, hide, show or delete products.
              </p>
            </div>
            <span className="text-sm text-black/50">
              {products.length} total
            </span>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl border border-black/10 bg-white px-5 py-12 text-center text-sm text-black/50">
              Abhi products nahi hain. Pehla product add karo.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-xl border border-black/10 bg-white"
                >
                  <div className="flex gap-3 p-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-24 w-24 shrink-0 rounded-lg bg-[#eeece6] object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-[#eeece6] text-xs text-black/40">
                        No image
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold">
                        {product.name}
                      </p>
                      <p className="mt-1 font-bold">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </p>
                      <p
                        className={`mt-2 text-xs ${
                          product.is_active
                            ? "text-green-700"
                            : "text-black/45"
                        }`}
                      >
                        {product.is_active
                          ? "Visible on website"
                          : "Hidden from website"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border-t border-black/10">
                    <button
                      type="button"
                      onClick={() => startEditing(product)}
                      className="border-r border-black/10 px-1 py-3 text-xs font-semibold hover:bg-black/5"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleProduct(product)}
                      className="border-r border-black/10 px-1 py-3 text-xs font-semibold hover:bg-black/5"
                    >
                      {product.is_active ? "Hide" : "Show"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProduct(product)}
                      className="px-1 py-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
