"use client";

import { useEffect } from "react";
import { useProductStore } from "@/store/productStore";

export default function PosSuccessClient() {
  const { clearCart } = useProductStore();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}
