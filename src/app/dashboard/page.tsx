export default function Dashboard() {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
            <nav className="mt-4">
              <a href="/dashboard" className="font-bold text-blue-600 hover:text-blue-800 mr-4">Dashboard</a>
              <a href="/members" className="text-blue-600 hover:text-blue-800 mr-4">Membros</a>
              <a href="/" className="text-blue-600 hover:text-blue-800">Logout</a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <p>Main vazia</p>
        </main>
      </div>
    );
  }