import { Suspense } from "react";
import ConfiguracionClient from "./ConfiguracionClient";

export const dynamic = "force-dynamic"; // evita problemas de prerender con querystring
export const revalidate = 0;            // (opcional) desactiva cache si prefieres

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Cargando configuración…</div>}>
      <ConfiguracionClient />
    </Suspense>
  );
}