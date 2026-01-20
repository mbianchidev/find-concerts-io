'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navLinks = [
    { href: '/', label: 'Concerts' },
    { href: '/artists', label: 'Artists' },
    { href: '/venues', label: 'Venues' },
    { href: '/tours', label: 'Tours' },
  ];

  return (
    <header className="glass-dark sticky top-0 z-50 border-b border-metal-steel/20 backdrop-blur-xl clip-angle-br">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="group">
              <h1 className="text-2xl md:text-3xl font-display font-black tracking-wider cursor-pointer transition-all duration-300">
                <span className="metal-text-crimson animate-pulse-sheen">FIND</span>
                <span className="text-metal-steel ml-2">CONCERTS</span>
              </h1>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <div className="flex items-center space-x-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 font-display text-sm font-bold uppercase tracking-wider transition-all duration-300 clip-angle-tl ${
                    isActive(link.href)
                      ? 'metal-text-steel metal-border-steel bg-metal-steel/10' 
                      : 'text-white/70 hover:text-metal-crimson hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative p-2 glass bg-white/5 hover:bg-white/10 transition-all duration-300 group clip-angle-dual"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              <div className="w-6 h-5 relative flex flex-col justify-between">
                <span className={`w-full h-0.5 bg-accent-crimson rounded-full transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`w-full h-0.5 bg-metal-steel rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`w-full h-0.5 bg-accent-cobalt rounded-full transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 animate-mechanical-slide">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link, index) => {
                const delayClass = ['delay-100', 'delay-200', 'delay-300', 'delay-400'][index] || '';
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all duration-300 animate-mechanical-slide clip-angle-tl ${delayClass} ${
                      isActive(link.href)
                        ? 'metal-text-steel metal-border-steel bg-metal-steel/10' 
                        : 'text-white/70 hover:text-metal-crimson hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}