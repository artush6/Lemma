import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Lemma — mathematical notes',description:'A calm writing space for mathematical thinking.'};
export default function RootLayout({children}:LayoutProps<'/'>){return <html lang="en"><body>{children}</body></html>}
