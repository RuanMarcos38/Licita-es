import type { Metadata } from "next";
import "./globals.css";

export const metadata:Metadata={
  title:"Licitações Brasil | Inteligência em Compras Públicas",
  description:"Busque oportunidades de licitações públicas em fontes oficiais de todo o Brasil."
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body>{children}</body></html>;
}
