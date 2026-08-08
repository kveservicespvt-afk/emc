import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="section flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="text-5xl font-extrabold text-forest">404</h1>
      <p className="mt-3 text-gray-600">We couldn't find that page.</p>
      <Link to="/" className="btn-primary mt-6">Back to Home</Link>
    </div>
  );
}
