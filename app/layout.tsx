import type { Metadata } from 'next';
export const metadata: Metadata={title:'AeroShare — Global Private Aviation',description:'Global airport reference, real aircraft observations and private aviation enquiries.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body style={{margin:0}}>{children}</body></html>}
