export default function EnConstruccion({ titulo }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-10 text-center">
      <h1 className="font-serif text-3xl text-vino">{titulo}</h1>
      <p className="text-gray-500 mt-2">Esta sección se construirá en el siguiente paso.</p>
    </div>
  )
}