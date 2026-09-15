"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCustomer } from "@/app/actions/customer";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    displayName: "",
    legalName: "",
    contactType: "INDIVIDUAL",
    segment: "RETAIL",
    phone: "",
    isWhatsApp: true,
    email: "",
    addressLine1: "",
    locality: "",
    district: "",
    state: "",
    pincode: "",
    gstin: "",
    isGstRegistered: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const customer = await createCustomer(formData);
      router.push(`/sales/new?customerId=${customer.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-content max-w-4xl">
        <div className="page-header flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/customers" className="btn btn-ghost px-2">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-page-title">New Customer</h1>
              <p className="text-muted mt-1">Create a new customer profile and immediately start an order.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Primary Details */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-card-title">Primary Details</h3>
              </div>
              <div className="card-body space-y-4">
                <div className="form-group">
                  <label className="form-label">Display Name *</label>
                  <input required name="displayName" value={formData.displayName} onChange={handleChange} className="input" placeholder="e.g. John Doe / Acme Corp" />
                </div>
                <div className="form-group">
                  <label className="form-label">Legal Name</label>
                  <input name="legalName" value={formData.legalName} onChange={handleChange} className="input" placeholder="Official business name (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select name="contactType" value={formData.contactType} onChange={handleChange} className="select">
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="BUSINESS">Business</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Segment</label>
                    <select name="segment" value={formData.segment} onChange={handleChange} className="select">
                      <option value="RETAIL">Retail</option>
                      <option value="WHOLESALE">Wholesale</option>
                      <option value="CORPORATE">Corporate</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-card-title">Contact Information</h3>
              </div>
              <div className="card-body space-y-4">
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input" placeholder="10-digit number" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" name="isWhatsApp" checked={formData.isWhatsApp} onChange={handleChange} />
                  Number is on WhatsApp
                </label>
                <div className="form-group pt-2">
                  <label className="form-label">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="input" placeholder="Email for invoices" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="card md:col-span-2">
              <div className="card-header">
                <h3 className="text-card-title">Billing Address & Tax</h3>
              </div>
              <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group md:col-span-2">
                  <label className="form-label">Address Line 1</label>
                  <input name="addressLine1" value={formData.addressLine1} onChange={handleChange} className="input" placeholder="Street address, building, etc." />
                </div>
                <div className="form-group">
                  <label className="form-label">Locality / City</label>
                  <input name="locality" value={formData.locality} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input name="district" value={formData.district} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input name="state" value={formData.state} onChange={handleChange} className="input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input name="pincode" value={formData.pincode} onChange={handleChange} className="input" />
                </div>

                <div className="form-group md:col-span-2 pt-4 border-t border-gray-100 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm mb-2 font-medium">
                    <input type="checkbox" name="isGstRegistered" checked={formData.isGstRegistered} onChange={handleChange} />
                    GST Registered Business
                  </label>
                  {formData.isGstRegistered && (
                    <input name="gstin" value={formData.gstin} onChange={handleChange} className="input" placeholder="15-digit GSTIN" />
                  )}
                </div>
              </div>
            </div>
            
          </div>
          
          <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
            <Link href="/customers" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save className="w-4 h-4" />
              {loading ? "Creating..." : "Create & Start Order"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
