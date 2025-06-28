export default function Footer() {
  return (
    <footer className="w-full py-6 border-t">
      <div className="container flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Codbbit. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
