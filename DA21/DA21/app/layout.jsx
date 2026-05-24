import './globals.css';

export const metadata = {
  title: 'DA21 LinkedRx — Audit LinkedIn',
  description: 'Audit LinkedIn avec 3 IA en parallèle',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
