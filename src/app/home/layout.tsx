export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='relative min-h-screen pb-16'>{children}</div>;
}
