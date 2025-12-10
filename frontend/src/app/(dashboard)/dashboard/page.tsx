export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD 1 */}
        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 uppercase">Total Revenue</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">$45,231.89</p>
          <p className="text-sm text-green-600 mt-1">+20.1% from last month</p>
        </div>

        {/* CARD 2 */}
        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500 uppercase">Active Users</h3>
            <p className="mt-2 text-3xl font-bold text-slate-900">+2350</p>
            <p className="text-sm text-green-600 mt-1">+180.1% from last month</p>
        </div>

        {/* CARD 3 */}
        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500 uppercase">Sales</h3>
            <p className="mt-2 text-3xl font-bold text-slate-900">+12,234</p>
            <p className="text-sm text-green-600 mt-1">+19% from last month</p>
        </div>
      </div>
      
      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 mt-6">
        <h2 className="text-lg font-bold mb-4">Recent Activity (Protected Data)</h2>
        <p className="text-slate-600">
            This dashboard is only visible because you have a valid <code>HTTPOnly Cookie</code> (Refresh Token) 
            and a valid <code>JWT Access Token</code> (in Memory).
        </p>
      </div>
    </div>
  );
}
