import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface Product {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  image: string;
  categoryId?: number | null;
  category?: string | null;
  sizeIds?: number[];
  sizes: string[];
  colorIds?: number[];
  colors: string[];
  stock: number;
  isActive: boolean;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  sizeId: number | null;
  size: string | null;
  colorId: number | null;
  color: string | null;
  stock: number;
  isActive: boolean;
}

export interface CartItem extends Product {
  cartItemId: string;
  variantId: number;
  selectedSize?: string;
  selectedColor?: string;
  quantity: number;
}

export interface ProductSelection {
  variantId?: number;
  size?: string;
  color?: string;
}

type CouponStatus = "success" | "error" | "";

interface ProductStore {
  products: Product[];
  cart: CartItem[];
  favoriteIds: number[];

  couponCode: string;
  discount: number;
  couponMessage: string;
  couponStatus: CouponStatus;

  setProducts: (products: Product[]) => void;
  fetchProducts: () => Promise<void>;
  addToCart: (product: Product, selection?: ProductSelection) => boolean;

  increaseQuantity: (cartItemId: string) => void;
  decreaseQuantity: (cartItemId: string) => void;
  setProductQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  toggleFavorite: (productId: number) => void;

  setCouponCode: (code: string) => void;
  copyCoupon: (code: string) => void;
  applyCoupon: () => Promise<void>;
  removeCoupon: () => void;
}

export const createCartItemId = (
  productId: number,
  selection: ProductSelection = {},
) =>
  [
    productId,
    selection.size?.trim().toLocaleLowerCase("tr-TR") ?? "",
    selection.color?.trim().toLocaleLowerCase("tr-TR") ?? "",
  ].join("::");

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [],
      cart: [],
      favoriteIds: [],

      couponCode: "",
      discount: 0,
      couponMessage: "",
      couponStatus: "",

      setProducts: (products) => set({ products }),

      fetchProducts: async () => {
        try {
          const response = await fetch("/api/products", {
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error("Ürünler getirilemedi.");
          }

          const data = await response.json();
          const fetchedProducts: Product[] = Array.isArray(data) ? data : [];

          set((state) => ({
            products: fetchedProducts,
            cart: state.cart.map((item) => {
              const latestProduct = fetchedProducts.find(
                (product) => product.id === item.id,
              );

              const latestVariant = latestProduct?.variants.find(
                (variant) =>
                  variant.id === item.variantId ||
                  (variant.size === (item.selectedSize ?? null) &&
                    variant.color === (item.selectedColor ?? null)),
              );

              return latestProduct && latestVariant
                ? {
                    ...item,
                    ...latestProduct,
                    cartItemId: item.cartItemId,
                    variantId: latestVariant.id,
                    selectedSize: item.selectedSize,
                    selectedColor: item.selectedColor,
                    stock: latestVariant.stock,
                    quantity: item.quantity,
                  }
                : item;
            }),
          }));
        } catch (error) {
          console.error("Ürün listeleme hatası:", error);

          set({
            products: [],
          });
        }
      },

      addToCart: (product, selection = {}) => {
        const { cart } = get();

        if (!product.isActive || product.stock <= 0) {
          return false;
        }

        const selectedSize = selection.size?.trim() || undefined;
        const selectedColor = selection.color?.trim() || undefined;

        if (
          (product.sizes.length > 0 &&
            (!selectedSize || !product.sizes.includes(selectedSize))) ||
          (product.colors.length > 0 &&
            (!selectedColor || !product.colors.includes(selectedColor)))
        ) {
          return false;
        }

        const selectedVariant = product.variants.find(
          (variant) =>
            variant.isActive &&
            variant.size === (selectedSize ?? null) &&
            variant.color === (selectedColor ?? null),
        );

        if (!selectedVariant || selectedVariant.stock <= 0) {
          return false;
        }

        const cartItemId = createCartItemId(product.id, {
          variantId: selectedVariant.id,
          size: selectedSize,
          color: selectedColor,
        });
        const existingProduct = cart.find(
          (item) => item.cartItemId === cartItemId,
        );

        if (existingProduct) {
          if (existingProduct.quantity >= selectedVariant.stock) {
            return false;
          }

          set({
            cart: cart.map((item) =>
              item.cartItemId === cartItemId
                ? {
                    ...item,
                    ...product,
                    cartItemId,
                    variantId: selectedVariant.id,
                    selectedSize,
                    selectedColor,
                    stock: selectedVariant.stock,
                    quantity: item.quantity + 1,
                  }
                : item,
            ),
          });

          return true;
        }

        set({
          cart: [
            ...cart,
            {
              ...product,
              cartItemId,
              variantId: selectedVariant.id,
              selectedSize,
              selectedColor,
              stock: selectedVariant.stock,
              quantity: 1,
            },
          ],
        });

        return true;
      },

      increaseQuantity: (cartItemId) => {
        const { cart } = get();
        const selectedItem = cart.find(
          (item) => item.cartItemId === cartItemId,
        );

        if (!selectedItem) {
          return;
        }

        set({
          cart: cart.map((item) =>
            item.cartItemId === cartItemId && item.quantity < item.stock
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item,
          ),
        });
      },

      decreaseQuantity: (cartItemId) => {
        const { cart } = get();

        set({
          cart: cart
            .map((item) =>
              item.cartItemId === cartItemId
                ? {
                    ...item,
                    quantity: item.quantity - 1,
                  }
                : item,
            )
            .filter((item) => item.quantity > 0),
        });
      },

      setProductQuantity: (productId, quantity) => {
        const { cart } = get();
        const productItems = cart.filter((item) => item.id === productId);

        if (productItems.length === 0) {
          return;
        }

        const currentQuantity = productItems.reduce(
          (total, item) => total + item.quantity,
          0,
        );
        const lastCartItem = productItems[productItems.length - 1];
        const maximumQuantity =
          currentQuantity - lastCartItem.quantity + lastCartItem.stock;
        const targetQuantity = Math.max(
          0,
          Math.min(Math.trunc(quantity), maximumQuantity),
        );

        if (targetQuantity === currentQuantity) {
          return;
        }

        if (targetQuantity > currentQuantity) {
          set({
            cart: cart.map((item) =>
              item.cartItemId === lastCartItem.cartItemId
                ? {
                    ...item,
                    quantity:
                      item.quantity + (targetQuantity - currentQuantity),
                  }
                : item,
            ),
          });
          return;
        }

        let amountToRemove = currentQuantity - targetQuantity;
        const reversedCart = [...cart].reverse();

        const reducedCart = reversedCart
          .map((item) => {
            if (item.id !== productId || amountToRemove <= 0) {
              return item;
            }

            const removedFromItem = Math.min(item.quantity, amountToRemove);
            amountToRemove -= removedFromItem;

            return {
              ...item,
              quantity: item.quantity - removedFromItem,
            };
          })
          .filter((item) => item.quantity > 0)
          .reverse();

        set({
          cart: reducedCart,
        });
      },

      removeFromCart: (cartItemId) => {
        const { cart } = get();

        set({
          cart: cart.filter((item) => item.cartItemId !== cartItemId),
        });
      },

      clearCart: () => {
        set({
          cart: [],
          couponCode: "",
          discount: 0,
          couponMessage: "",
          couponStatus: "",
        });
      },

      toggleFavorite: (productId) => {
        const { favoriteIds } = get();

        set({
          favoriteIds: favoriteIds.includes(productId)
            ? favoriteIds.filter((id) => id !== productId)
            : [...favoriteIds, productId],
        });
      },

      setCouponCode: (code) => {
        set({
          couponCode: code,
        });
      },

      copyCoupon: (code) => {
        navigator.clipboard.writeText(code).catch((error) => {
          console.error("Kupon kopyalanamadı:", error);
        });

        set({
          couponCode: code,
          couponMessage: `${code} kuponu kopyalandı`,
          couponStatus: "success",
        });
      },

      applyCoupon: async () => {
        const { couponCode } = get();
        const normalizedCouponCode = couponCode.trim().toUpperCase();

        if (normalizedCouponCode === "") {
          set({
            discount: 0,
            couponMessage: "Lütfen kupon kodu giriniz!",
            couponStatus: "error",
          });
          return;
        }

        try {
          const response = await fetch("/api/coupons/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: normalizedCouponCode }),
          });

          const data = await response.json();

          if (!response.ok || data.status === "error") {
            set({
              discount: 0,
              couponMessage: data.message || "Geçersiz kupon kodu!",
              couponStatus: "error",
            });
            return;
          }

          set({
            couponCode: data.coupon.code,
            discount: data.coupon.discount,
            couponMessage:
              data.message || `${data.coupon.code} kuponu uygulandı`,
            couponStatus: "success",
          });
        } catch (error) {
          console.error("Kupon doğrulama hatası:", error);
          set({
            discount: 0,
            couponMessage: "Kupon doğrulanırken hata oluştu.",
            couponStatus: "error",
          });
        }
      },

      removeCoupon: () => {
        set({
          discount: 0,
          couponCode: "",
          couponMessage: "Kupon kaldırıldı",
          couponStatus: "success",
        });
      },
    }),
    {
      name: "nova-store-cart",
      storage: createJSONStorage(() => localStorage),
      version: 4,

      migrate: (persistedState) => {
        const state = persistedState as Partial<ProductStore>;
        const migratedCart = Array.isArray(state.cart)
          ? state.cart.map((item) => ({
              ...item,
              sizes: Array.isArray(item.sizes) ? item.sizes : [],
              colors: Array.isArray(item.colors) ? item.colors : [],
              variants: Array.isArray(item.variants) ? item.variants : [],
              cartItemId:
                item.cartItemId ??
                createCartItemId(item.id, {
                  variantId: item.variantId,
                  size: item.selectedSize,
                  color: item.selectedColor,
                }),
            }))
          : [];

        return {
          ...state,
          cart: migratedCart,
          favoriteIds: Array.isArray(state.favoriteIds)
            ? state.favoriteIds
            : [],
        } as ProductStore;
      },

      partialize: (state) => ({
        cart: state.cart,
        couponCode: state.couponCode,
        discount: state.discount,
        favoriteIds: state.favoriteIds,
      }),
    },
  ),
);
