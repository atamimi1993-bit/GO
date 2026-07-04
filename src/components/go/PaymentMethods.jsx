import React from 'react';

export default function PaymentMethods() {
  return (
    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Secure checkout via</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold bg-black text-white px-2 py-1 rounded">Pay</span>
        <span className="text-[10px] font-bold bg-black text-white px-1.5 py-1 rounded">G Pay</span>
        <span className="text-[10px] font-bold bg-white border px-2 py-1 rounded text-blue-600">VISA</span>
        <span className="text-[10px] font-bold bg-white border px-2 py-1 rounded text-orange-600">MC</span>
        <span className="text-[10px] font-bold bg-white border px-2 py-1 rounded text-blue-900">AMEX</span>
        <span className="text-[10px] font-bold bg-white border px-2 py-1 rounded text-green-600">Link</span>
        <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-1 rounded">Cash App</span>
      </div>
    </div>
  );
}