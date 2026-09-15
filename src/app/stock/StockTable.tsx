"use client";

import React, { useState } from "react";
import { Search, Plus, ArrowRightLeft, AlertTriangle, Edit3, Image as ImageIcon } from "lucide-react";
import { updateProductImage } from "@/app/actions/stock";

type StockProduct = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  isActive: boolean;
  physical: number;
  reserved: number;
  held: number;
  available: number;
  minimum: number | null;
  isBelowMinimum: boolean;
  latestPrice: number;
};

export const StockTable: React.FC<{ initialData: StockProduct[] }> = ({ initialData }) => {
  const [data, setData] = useState<StockProduct[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleEditImage = async (productId: string) => {
    const url = window.prompt("Enter new image URL for this product:");
    if (!url) return;
    
    setUpdating(productId);
    try {
      await updateProductImage(productId, url);
      setData(prev => prev.map(p => p.id === productId ? { ...p, imageUrl: url } : p));
    } catch (e) {
      alert("Failed to update image");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = data.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
          <input
            type="text"
            placeholder="Search by SKU, name or category..."
            className="input !pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            <ArrowRightLeft className="w-4 h-4" /> Transfer
          </button>
          <button className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th className="text-right">Price</th>
              <th className="text-right">On Hand</th>
              <th className="text-right">Reserved</th>
              <th className="text-right">Available</th>
              <th className="text-right">Minimum</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center" style={{ padding: "40px", color: "var(--color-text-muted)" }}>
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr key={product.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="w-16">
                    <div className="relative w-10 h-10 rounded border bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage(product.imageUrl!)}
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                      )}
                      <button 
                        onClick={() => handleEditImage(product.id)}
                        disabled={updating === product.id}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit3 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </td>
                  <td className="font-medium text-slate-900">{product.sku}</td>
                  <td>
                    <div className="font-medium">{product.name}</div>
                  </td>
                  <td>{product.category ?? "—"}</td>
                  <td className="text-right text-tabular font-medium">₹ {product.latestPrice.toFixed(2)}</td>
                  <td className="text-right text-tabular">{product.physical}</td>
                  <td className="text-right text-tabular text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {product.reserved}
                  </td>
                  <td className="text-right text-tabular font-bold" style={{ color: product.available > 0 ? "#166534" : "#B91C1C" }}>
                    {product.available}
                  </td>
                  <td className="text-right text-tabular text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {product.minimum ?? "—"}
                  </td>
                  <td>
                    {product.isBelowMinimum ? (
                      <span className="badge badge-red flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </span>
                    ) : product.available > 0 ? (
                      <span className="badge badge-green">In Stock</span>
                    ) : (
                      <span className="badge badge-red">Out of Stock</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          style={{ background: "rgb(0 0 0 / 0.8)", backdropFilter: "blur(4px)", padding: "16px" }}
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Enlarged product"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              style={{ boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
            />
            <button
              className="absolute top-4 right-4 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"
              style={{ background: "rgb(0 0 0 / 0.5)" }}
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
