"use client"

import { LoginForm } from "@/components/auth/login-form"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getLoginImageByTime, getGreetingByTime } from "@/lib/login-images"
import { isAuthenticated } from "@/lib/auth"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [backgroundImage, setBackgroundImage] = useState("")
  const [greeting, setGreeting] = useState("")
  const [tagline, setTagline] = useState("")
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Si ya está autenticado, redirigir a la página principal
    if (isAuthenticated()) {
      router.push("/")
      return
    }

    const updateContent = () => {
      setBackgroundImage(getLoginImageByTime())
      setGreeting(getGreetingByTime())
    }

    // Actualizar inmediatamente
    updateContent()

    // Seleccionar un eslogan aleatorio al cargar la página
    const taglines = [
      "Operaciones de transporte más simples, rápidas y seguras",
      "Tu carga, nuestra prioridad en cada kilómetro",
      "Control total de tus embarques, sin complicaciones",
      "Movemos tus metas con puntualidad y confianza",
      "Visibilidad y eficiencia para cada envío",
      "Cruzando Norteamérica contigo, paso a paso",
      "Decisiones claras, resultados a tiempo",
      "La tranquilidad de saber dónde va tu carga",
      "Tecnología y servicio que impulsan tu operación",
      "Gestiona tu flota de transporte con toda confianza, somos parte de tu equipo.",
    ]
    setTagline(taglines[Math.floor(Math.random() * taglines.length)])

    const interval = setInterval(updateContent, 300000)

    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        {/* Left side - Welcome section with dynamic background image */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {/* Dynamic background image */}
          <div className="absolute inset-0">
            <img
              src={backgroundImage || "/placeholder.svg?height=1080&width=1920&query=white trucks on highway"}
              alt="Tractocamiones en carretera"
              className="w-full h-full object-cover transition-opacity duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
          </div>

          {/* Content overlay */}
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Bienvenido de
              <br />
              <span className="text-amber-400">Vuelta</span>
            </h1>
            <p className="text-xl text-gray-200 mb-8 leading-relaxed max-w-md">{tagline}</p>

            {/* Company info */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇲🇽</span>
                  <span className="text-2xl">🇺🇸</span>
                  <span className="text-2xl">🇨🇦</span>
                </div>
                <span className="font-medium">Transportes Internacionales Monarca</span>
              </div>

              <div className="text-sm text-amber-300 font-medium">{greeting}, Usuario</div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            {/* Mobile header - only visible on small screens */}
            <div className="lg:hidden text-center mb-8">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LOGO%20MONARCA-Qr7vd747xwSM8JxAy9kmgezl3mcHRh.png"
                alt="Transportes Internacionales Monarca"
                className="w-16 h-16 mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Transportes Internacionales Monarca</h1>
              <p className="text-gray-600">Sistema de Gestión de Transporte</p>
            </div>

            <div className="text-center mb-6">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LOGO%20MONARCA-Qr7vd747xwSM8JxAy9kmgezl3mcHRh.png"
                alt="Transportes Internacionales Monarca"
                // Oculto en móviles, visible en pantallas grandes para evitar duplicado
                className="w-16 h-16 mx-auto mb-4 hidden lg:block"
              />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
              <p className="text-gray-600">Ingresa tus credenciales para acceder al sistema</p>
            </div>

            <LoginForm onOpenPrivacy={() => setPrivacyOpen(true)} onOpenTerms={() => setTermsOpen(true)} />
          </div>
        </div>
      </div>

      <footer className="bg-gray-50 border-t border-gray-200 py-4 px-8">
        <div className="text-center text-sm text-gray-500">
          Made by: <span className="font-medium text-gray-700">Kleos Digital 2025</span> for{" "}
          <span className="font-medium text-gray-700">Transportes Internacionales Monarca</span>{" "}
          <span className="text-gray-400">v1.0</span>
        </div>
      </footer>

      {/* Política de privacidad modal */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aviso de Privacidad</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-4 text-sm text-gray-800">
              <p>
                Su privacidad y confianza son muy importantes para nosotros. Por ello, queremos asegurarnos de que conozca cómo salvaguardamos la integridad, privacidad y protección de sus Datos Personales.
              </p>
              <p>
                Consideramos que, por ser una empresa socialmente responsable, tenemos la obligación legal y social de cumplir con las medidas legales y de seguridad suficientes para proteger aquellos Datos Personales que se hayan recabado para las finalidades que se describen en el presente aviso de privacidad.
              </p>
              <p>
                En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, su Reglamento y demás normativas aplicables en la materia, se emite el presente Aviso de Privacidad Integral bajo los siguientes términos:
              </p>

              <h3 className="font-semibold">I. Identidad y domicilio del responsable</h3>
              <p>
                Transportes Internacionales Monarca, S.A. de C.V. (en adelante, "el Responsable"), con domicilio en Nuevo Laredo, Tamaulipas, México, es el responsable del tratamiento, uso y protección de sus datos personales.
              </p>

              <h3 className="font-semibold">II. Finalidades del tratamiento</h3>
              <p className="font-medium">Finalidades primarias</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Identificación y validación de identidad.</li>
                <li>Gestión de cotizaciones, altas, bajas y modificaciones en el padrón de clientes.</li>
                <li>Emisión de facturación y control administrativo.</li>
                <li>Celebración de convenios o contratos de servicios, nacionales e internacionales.</li>
                <li>Gestión de cuentas por cobrar.</li>
                <li>Elaboración de estadísticas internas.</li>
                <li>Cumplimiento de obligaciones legales, fiscales y contractuales.</li>
                <li>Atención de requerimientos de autoridades administrativas o judiciales.</li>
              </ul>
              <p className="font-medium">Finalidades secundarias</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Envío de comunicaciones comerciales, promociones o boletines informativos.</li>
                <li>Encuestas de satisfacción y mejora en la calidad del servicio.</li>
                <li>Difusión de información sobre pagos y facturación.</li>
              </ul>

              <h3 className="font-semibold">III. Datos personales recabados</h3>
              <p>Los datos personales que recabamos, ya sea directa o indirectamente, incluyen:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Nombre completo.</li>
                <li>Dirección particular y/o fiscal.</li>
                <li>Comprobante de domicilio.</li>
                <li>RFC, CURP.</li>
                <li>Identificación oficial con fotografía.</li>
                <li>Número telefónico (fijo y móvil).</li>
                <li>Firma autógrafa.</li>
                <li>Giro comercial y sitio web.</li>
                <li>Referencias comerciales.</li>
                <li>Estados de cuenta bancarios.</li>
                <li>Declaraciones fiscales.</li>
              </ul>

              <h3 className="font-semibold">IV. Transferencia de datos personales</h3>
              <p>
                Sus datos personales podrán ser transferidos a las siguientes personas o entidades, sin requerir su consentimiento en los términos del artículo 37 de la Ley:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Empresas afiliadas o subsidiarias de Transportes Internacionales Monarca.</li>
                <li>Despachos externos para asesoría legal, contable o de cobranza.</li>
                <li>Autoridades competentes, cuando lo requiera la ley o un mandato judicial.</li>
                <li>En ejercicio o defensa de un derecho en juicio.</li>
              </ul>
              <p>En ningún caso comercializaremos, venderemos o rentaremos su información personal a terceros.</p>

              <h3 className="font-semibold">V. Medidas de seguridad</h3>
              <p>
                El Responsable ha implementado medidas de seguridad administrativas, técnicas y físicas que permiten proteger sus datos personales contra daño, pérdida, alteración, destrucción, uso, acceso o tratamiento no autorizado.
              </p>

              <h3 className="font-semibold">VI. Derechos ARCO y medios para ejercerlos</h3>
              <p>
                Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (derechos ARCO) al tratamiento de sus datos personales. Para ejercer estos derechos, envíe su solicitud al Departamento de Protección de Datos Personales del Responsable. Incluya: nombre y datos de contacto, copia de identificación oficial, descripción clara del derecho que desea ejercer y cualquier elemento que facilite la localización de sus datos.
              </p>
              <p>
                Recibirá respuesta en un máximo de 20 días hábiles y, de resultar procedente, se ejecutará dentro de los 15 días hábiles siguientes.
              </p>

              <h3 className="font-semibold">VII. Revocación del consentimiento y limitación de uso</h3>
              <p>
                Puede revocar el consentimiento otorgado para el tratamiento de sus datos personales, así como limitar su uso o divulgación, mediante los canales de contacto indicados anteriormente. Asimismo, puede inscribirse en el Registro Público para Evitar Publicidad de PROFECO.
              </p>

              <h3 className="font-semibold">VIII. Uso de tecnologías de rastreo</h3>
              <p>
                Informamos que no utilizamos cookies, web beacons u otras tecnologías de rastreo en nuestro sitio que recojan datos personales de los usuarios.
              </p>

              <h3 className="font-semibold">IX. Cambios al aviso de privacidad</h3>
              <p>
                Este aviso puede sufrir modificaciones derivadas de cambios legales, requerimientos internos o políticas de privacidad. Cualquier cambio será informado a través de los canales oficiales del Responsable.
              </p>

              <p className="text-xs text-gray-600">
                Este Aviso de Privacidad cumple con los lineamientos establecidos en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, su Reglamento y los Lineamientos emitidos por el INAI.
              </p>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrivacyOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

  {/* Términos de servicio modal */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
    <DialogTitle>Términos de Servicio</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-4 text-sm text-gray-800">
              <p>
                Estos Términos de Privacidad regulan el uso que usted hace de la plataforma de Transportes Internacionales Monarca, S.A. de C.V. ("la Empresa") en lo relativo al tratamiento de datos personales.
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Al utilizar esta plataforma, usted reconoce y acepta el Aviso de Privacidad vigente y autoriza el tratamiento de sus datos conforme a las finalidades ahí descritas.
                </li>
                <li>
                  La Empresa implementa medidas de seguridad administrativas, técnicas y físicas para proteger la información, sin garantizar su invulnerabilidad absoluta.
                </li>
                <li>
                  Usted puede ejercer en todo momento sus derechos ARCO a través de los canales indicados en el Aviso de Privacidad.
                </li>
                <li>
                  La información mostrada en la plataforma es de uso interno y puede estar sujeta a confidencialidad. Queda prohibida su divulgación no autorizada.
                </li>
                <li>
                  La Empresa podrá actualizar estos términos y el Aviso de Privacidad; el uso continuado de la plataforma implica su aceptación de dichas actualizaciones.
                </li>
              </ul>
              <p>
                En caso de discrepancia entre estos términos y el Aviso de Privacidad, prevalecerá lo establecido en el Aviso de Privacidad.
              </p>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTermsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
