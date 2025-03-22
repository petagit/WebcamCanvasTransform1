import React from "react";

export default function Footer() {
  return (
    <footer className="bg-app-dark-light py-4 mt-6">
      <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} PixelCam | Privacy Policy | Terms of Service</p>
      </div>
    </footer>
  );
}
