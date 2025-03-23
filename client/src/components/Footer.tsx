import React from "react";

export default function Footer() {
  return (
    <footer className="bg-app-dark-light py-4 mt-6">
      <div className="container mx-auto px-4 text-center text-white text-sm">
        <p>&copy; {new Date().getFullYear()} <span className="font-medium">PixelCam</span> | Privacy Policy | Terms of Service</p>
      </div>
    </footer>
  );
}
