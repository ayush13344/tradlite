import React, { useEffect, useState } from "react";

function formatNum(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "--";
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function OrderCard({ order }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                order.side === "BUY"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {order.side}
            </span>
            <span className="text-sm font-semibold text-gray-900">{order.symbol}</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">{order.createdAt}</div>
        </div>

        <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700">
          {order.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-gray-50 p-2">
          <div className="text-gray-500">Order Type</div>
          <div className="mt-1 font-semibold text-gray-900">{order.orderType}</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-2">
          <div className="text-gray-500">Product</div>
          <div className="mt-1 font-semibold text-gray-900">{order.productType}</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-2">
          <div className="text-gray-500">Quantity</div>
          <div className="mt-1 font-semibold text-gray-900">{order.quantity}</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-2">
          <div className="text-gray-500">Executed Price</div>
          <div className="mt-1 font-semibold text-gray-900">₹{formatNum(order.executedPrice)}</div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const sync = () => {
      try {
        setOrders(JSON.parse(localStorage.getItem("portfolio_orders")) || []);
      } catch {
        setOrders([]);
      }
    };

    sync();
    window.addEventListener("portfolio-updated", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("portfolio-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 px-6 pt-24">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Orders</h1>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
              No orders available.
            </div>
          ) : (
            orders.map((order) => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      </div>
    </div>
  );
}