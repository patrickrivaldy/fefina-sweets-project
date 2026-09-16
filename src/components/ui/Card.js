export default function Card({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>

      <h2 className="mt-2 text-2xl font-bold text-gray-800">{value}</h2>

      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}
