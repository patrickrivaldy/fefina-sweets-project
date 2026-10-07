"use client";

import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // =========================
  // TAMBAH PRODUK KE CART
  // =========================
  const addToCart = (product) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id_produk === product.id_produk
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id_produk === product.id_produk
            ? {
                ...item,
                qty: item.qty + 1,
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          id_produk: product.id_produk,
          nama_produk: product.nama_produk,
          harga_jual: product.harga_jual,
          foto: product.foto,
          stok: product.stok,
          qty: 1,
        },
      ];
    });
  };

  // =========================
  // HAPUS PRODUK DARI CART
  // =========================
  const removeFromCart = (id_produk) => {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) => item.id_produk !== id_produk
      )
    );
  };

  // =========================
  // UBAH JUMLAH PRODUK
  // =========================
  const updateQuantity = (id_produk, qty) => {
  setCartItems((currentItems) =>
    currentItems.map((item) => {
      if (item.id_produk !== id_produk) {
        return item;
      }

      const newQuantity = Math.max(
        1,
        Math.min(qty, item.stok)
      );

      return {
        ...item,
        qty: newQuantity,
      };
    })
  );
};

  // =========================
  // KOSONGKAN CART
  // =========================
  const clearCart = () => {
    setCartItems([]);
  };

  // =========================
  // TOTAL ITEM
  // =========================
  const totalItems = cartItems.reduce(
    (total, item) => total + item.qty,
    0
  );

  // =========================
  // TOTAL HARGA
  // =========================
  const totalPrice = cartItems.reduce(
    (total, item) =>
      total + item.harga_jual * item.qty,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart harus digunakan di dalam CartProvider."
    );
  }

  return context;
}