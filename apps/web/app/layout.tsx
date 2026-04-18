import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const GA_MEASUREMENT_ID = 'G-LYMGG598WW';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Letreco',
  description: 'Adivinhe a palavra do dia em 6 tentativas — Wordle em português brasileiro',
  metadataBase: new URL('https://letreco.gleider.dev'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Letreco',
    title: 'Letreco',
    description: 'Adivinhe a palavra do dia em 6 tentativas — Wordle em português brasileiro',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-[#030712] text-gray-50 antialiased`}>
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
