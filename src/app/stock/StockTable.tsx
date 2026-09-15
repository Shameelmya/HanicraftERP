"use client";

import React, { useState } from "react";
import { Search, Plus, AlertTriangle, Edit3, Image as ImageIcon, Trash2 } from "lucide-react";
import { updateProductImage, upsertProduct, deleteProduct } from "@/app/actions/products";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  productType?: string;
  baseUom?: string;
};

export const StockTable: React.FC<{ initialData: StockProduct[] }> = ({ initialData }) => {
  const { user } = useAuth();
  const [data, setData] = useState<StockProduct[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<StockProduct> | null>(null);

  const handleEditImage = async (productId: string) => {
    const url = window.prompt("Enter new image URL for this product:");
    if (!url || !user?.email) return;
    
    setUpdating(productId);
    try {
      await updateProductImage(productId, url, user.email);
      setData(prev => prev.map(p => p.id === productId ? { ...p, imageUrl: url } : p));
    } catch (e: any) {
      alert("Failed to update image: " + e.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct?.sku || !editingProduct?.name || !user?.email) {
      alert("SKU and Name are required.");
      return;
    }
    
    setUpdating("saving");
    try {
      const saved = await upsertProduct({
        id: editingProduct.id,
        sku: editingProduct.sku,
        name: editingProduct.name,
        category: editingProduct.category,
        productType: editingProduct.productType || "FINISHED_CATALOGUE",
        baseUom: editingProduct.baseUom || "NOS",
        imageUrl: editingProduct.imageUrl,
        isActive: true, // Auto active for now
      }, user.email);
      
      setData(prev => {
        const exists = prev.find(p => p.id === saved.id);
        if (exists) {
          return prev.map(p => p.id === saved.id ? { ...p, ...saved } : p);
        }
        // It's a new product, it won't have stock yet, but we add it to the list
        return [{
          id: saved.id,
          sku: saved.sku,
          name: saved.name,
          category: saved.category,
          imageUrl: saved.imageUrl,
          isActive: saved.isActive,
          physical: 0,
          reserved: 0,
          held: 0,
          available: 0,
          minimum: 0,
          isBelowMinimum: false,
          latestPrice: 0,
          productType: saved.productType,
          baseUom: saved.baseUom,
        }, ...prev];
      });
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (e: any) {
      alert("Failed to save product: " + e.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.email) return;
    if (!window.confirm("Are you sure you want to delete this product? It will fail if there is existing stock or order history.")) return;
    
    setUpdating(id);
    try {
      await deleteProduct(id, user.email);
      setData(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      alert("Failed to delete product. It likely has existing stock or order history attached to it.");
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
          {/* Transfer button was removed. It was originally intended for multi-warehouse transfers (e.g. from Main Warehouse to Storefront). */}
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              setEditingProduct({ sku: "", name: "", category: "", imageUrl: "" });
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Product
          </Button>
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
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center" style={{ padding: "40px", color: "var(--color-text-muted)" }}>
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
                        title="Quick Edit Image"
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
                  <td className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          setEditingProduct(product);
                          setIsModalOpen(true);
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(product.id)}
                        disabled={updating === product.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Image Preview Modal */}
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
              className="absolute top-4 right-4 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/80 transition-colors"
              style={{ background: "rgb(0 0 0 / 0.5)" }}
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingProduct.id ? "Edit Product" : "Add Product"}</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">SKU *</label>
                <Input 
                  value={editingProduct.sku || ""} 
                  onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} 
                  placeholder="e.g. NMH238"
                  disabled={!!editingProduct.id} // Cannot edit SKU of existing product
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <Input 
                  value={editingProduct.name || ""} 
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Input 
                  value={editingProduct.category || ""} 
                  onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} 
                  placeholder="e.g. NMH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <Input 
                  value={editingProduct.imageUrl || ""} 
                  onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} 
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveProduct} disabled={updating === "saving"}>
                {updating === "saving" ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
