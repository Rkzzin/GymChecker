export default function subscriptions() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Matrículas</h1>
          <nav className="mt-4">
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">Dashboard</a>
            <a href="/members" className="text-blue-600 hover:text-blue-800 mr-4">Membros</a>
            <a href="/subscriptions" className="font-bold text-blue-600 hover:text-blue-800 mr-4">Matrículas</a>
            <a href="/" className="text-blue-600 hover:text-blue-800">Logout</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-xl font-semibold">Overview</h2>
          <p>Total Members: 50</p>
          <p>Total Revenue: $5000</p>
          <p>Upcoming Renewals: 10</p>
        </div>
      </main>
    </div>
  );
}