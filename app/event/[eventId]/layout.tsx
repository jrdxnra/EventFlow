// This layout handles static generation for dynamic event routes
export async function generateStaticParams() {
  return [];
}

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 