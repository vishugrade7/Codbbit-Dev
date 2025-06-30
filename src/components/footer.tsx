export default function Footer() {
  return (
    <footer className="w-full py-8 border-t bg-card">
      <div className="container text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} My New App. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
