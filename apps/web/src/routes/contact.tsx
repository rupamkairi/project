import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/contact",
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Contact Us</h1>
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <p className="text-gray-600 text-lg">
            We'd love to hear from you! Get in touch with us using the
            information below.
          </p>
          <div className="mt-6 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-gray-800 w-24">Email:</span>
              <span className="text-blue-600">
                contact@projectx.example.com
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-gray-800 w-24">Phone:</span>
              <span className="text-gray-600">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-gray-800 w-24">Address:</span>
              <span className="text-gray-600">
                123 Main Street, City, Country
              </span>
            </div>
          </div>
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-sm">
              This is a placeholder contact page. Replace with your actual
              contact information and contact form as needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
