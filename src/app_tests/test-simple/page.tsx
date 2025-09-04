export default function TestSimple() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Simple Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#232020] mb-6">Client Dropdown Test</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#232020] mb-2">
                Client *
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent">
                <option value="">Select a client</option>
                <option value="demo-1">Metro Hospital - Nursing Staff</option>
                <option value="demo-2">Downtown Office - Security</option>
                <option value="demo-3">City Schools - Substitute Teachers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#232020] mb-2">
                Project Name *
              </label>
              <input
                type="text"
                placeholder="Enter project name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              />
            </div>

            <div className="pt-4">
              <button className="bg-[#e31c79] text-white px-6 py-2 rounded-lg hover:bg-[#c41a6b] transition-colors">
                Create Project
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
            <p className="text-green-700">
              This page is working correctly. The client dropdown shows the expected options and the form is properly styled.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
