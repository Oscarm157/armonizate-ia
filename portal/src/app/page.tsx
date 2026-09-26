import { redirect } from "next/navigation";

// Este dominio es solo la herramienta: el sitio público de la clínica vive en otra parte
// (clinicaarmonizate.mx, en Hostinger). La raíz manda al panel, que a su vez manda al login
// si no hay sesión. Antes quedaba aquí la home placeholder del starter, visible para
// cualquiera que entrara al dominio a pelo.
export default function HomePage() {
  redirect("/admin");
}
