import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-border/10 py-4 mt-6">
      <div className="container mx-auto px-4 text-center text-foreground/60 text-xs">
        <p>&copy; {new Date().getFullYear()} <span className="font-serif text-primary">PixelCam</span> | Privacy Policy | Terms of Service</p>
      </div>
    </footer>
  );
}
