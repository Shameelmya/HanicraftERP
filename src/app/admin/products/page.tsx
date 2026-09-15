"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/AuthContext';
import { useEffect, useState } from 'react';
import { getProducts, updateProductImage } from '@/app/actions/products';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon } from 'lucide-react';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  
  const [editProduct, setEditProduct] = useState<any>(null);
  const [newImageUrl, setNewImageUrl] = useState("");

  const fetchData = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateImage = async () => {
    if (!editProduct) return;
    await updateProductImage(editProduct.id, newImageUrl, user!.email!);
    setEditProduct(null);
    setNewImageUrl("");
    fetchData();
  };

  const filtered = products.filter(p => p.productCode.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()));

  if (!user) return null;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Stock & Products Master</h1>
          <p className="text-slate-500">Manage all items, add stock image URLs.</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle>Products Master</CardTitle>
              <CardDescription>Total {products.length} items available.</CardDescription>
            </div>
            <div className="w-72">
              <Input placeholder="Search item code or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border rounded-md mt-4 mx-4 mb-4">
              <div className="bg-slate-50 p-3 font-semibold text-xs border-b text-slate-500 uppercase tracking-wider grid grid-cols-[100px_1fr_100px_100px_100px_150px] gap-4">
                <span>Image</span>
                <span>Item Code / Name</span>
                <span>Category</span>
                <span className="text-right">Stock</span>
                <span className="text-right">Reserved</span>
                <span className="text-center">Actions</span>
              </div>
              <ul className="divide-y max-h-[60vh] overflow-y-auto">
                {filtered.map(p => (
                  <li key={p.id} className="p-3 text-sm grid grid-cols-[100px_1fr_100px_100px_100px_150px] gap-4 items-center hover:bg-slate-50">
                    <div className="flex items-center justify-center">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-16 h-16 object-cover rounded-md cursor-pointer border hover:opacity-80 transition-opacity" 
                          onClick={() => setImageModalUrl(p.imageUrl)}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded-md border flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{p.productCode}</p>
                      <p className="text-xs text-slate-500">{p.name}</p>
                    </div>
                    <div><Badge variant="outline">{p.category}</Badge></div>
                    <div className="text-right font-medium">{p.stock}</div>
                    <div className="text-right text-amber-600">{p.reserved}</div>
                    <div className="flex justify-center">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditProduct(p);
                        setNewImageUrl(p.imageUrl || "");
                      }}>
                        Edit Image
                      </Button>
                    </div>
                  </li>
                ))}
                {filtered.length === 0 && <li className="p-6 text-center text-slate-500">No items match your search.</li>}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!imageModalUrl} onOpenChange={(open) => !open && setImageModalUrl(null)}>
          <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black/95 border-none">
            {imageModalUrl && (
              <img src={imageModalUrl} className="w-full h-auto max-h-[85vh] object-contain" alt="Enlarged" />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Image URL for {editProduct?.productCode}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input 
                  placeholder="https://example.com/image.jpg" 
                  value={newImageUrl} 
                  onChange={(e) => setNewImageUrl(e.target.value)} 
                />
              </div>
              <Button className="w-full" onClick={handleUpdateImage}>Save Image URL</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
