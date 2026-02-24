import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="card">
      <h2>Page not found</h2>
      <p>This route does not exist.</p>
      <Link to="/">Back to home</Link>
    </section>
  );
}
