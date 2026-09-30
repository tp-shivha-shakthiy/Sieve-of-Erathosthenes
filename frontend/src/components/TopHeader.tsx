import React from "react";
import { Lightbulb } from "lucide-react";

export const TopHeader: React.FC = () => {
  return (
    <header className="page-top-header">
      <div className="header-title-block">
        <h1 className="main-title">RSA Cryptography Demonstrator</h1>
        <p className="main-description">
          Learn how RSA works by generating primes using the Sieve of Eratosthenes,
          creating keys, and encrypting and decrypting messages.
        </p>
      </div>

      <div className="rsa-info-banner">
        <div className="info-banner-icon">
          <Lightbulb size={20} className="text-amber-500" />
        </div>
        <div className="info-banner-content">
          <h3 className="info-banner-title">What is RSA?</h3>
          <p className="info-banner-text">
            RSA is a widely used public-key cryptography algorithm. It uses two large
            prime numbers to create a public key for encryption and a private key for
            decryption.
          </p>
        </div>
      </div>
    </header>
  );
};
