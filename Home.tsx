/**
 * Upside Capital Markets — Exact replica of kmdxdkua.manus.space
 * Additions: Contact form + mobile slide-in hamburger menu
 */

import { useState, useEffect } from "react";
import { Menu, X, CheckCircle } from "lucide-react";

const SERVICES = [
  { num: "01", title: "Investment Advisory", desc: "Providing expert guidance on portfolio optimization, risk management, and capital allocation strategies." },
  { num: "02", title: "Acquisition and Disposition", desc: "Leveraging our extensive network and market intelligence to facilitate successful transactions." },
  { num: "03", title: "Asset Management", desc: "Actively managing properties to enhance performance and maximize returns for our clients." },
  { num: "04", title: "Research and Insights", desc: "Providing data-driven market analysis and thought leadership to inform our clients' investment decisions." },
  { num: "05", title: "Marketing and Communication", desc: "Our network of brand experts will bring your projects to qualified investors and targeted demographics." },
  { num: "06", title: "Architecture & Design", desc: "Award-winning world-renowned firms leverage cutting-edge strategies for best in class results." },
  { num: "07", title: "Permitting & Entitlements", desc: "Decades of Experience, hundreds of projects offering execution as a service." },
  { num: "08", title: "Pro forma Analysis & Support", desc: "Data verification, project development and comprehensive financial modeling." },
  { num: "09", title: "Joint Ventures & Strategic Partnership", desc: "Achieve highest outcomes and new levels of growth through strategic collaborations." },
  { num: "10", title: "Equity & Debt Finance", desc: "Refinance, LBO, GP & LP sales, credit lines and cross collateralization solutions." },
  { num: "11", title: "Hiring & Recruiting Support", desc: "Project specific or new markets - leverage our expertise finding capable and dialed in talent." },
  { num: "12", title: "Construction Management", desc: "Top-tier pre-construction resources minimize risk and deliver exceptional results." },
];

const VALUES = [
  { title: "Goal-Oriented", desc: "We are laser-focused on helping our clients achieve their investment objectives." },
  { title: "Innovative", desc: "Our forward-thinking strategies and data-driven approach set us apart from the competition." },
  { title: "Collaborative", desc: "We work closely with our clients to foster long-term, mutually beneficial relationships." },
  { title: "Principled", desc: "Integrity, transparency, and accountability are the cornerstones of our business." },
];

const NAV_LINKS = [
  { label: "Services", id: "services" },
  { label: "About", id: "about" },
  { label: "Contact", id: "contact" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, menuOpen ? 300 : 0);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("submitting");
    // Compose mailto link with form data
    const subject = encodeURIComponent(`New Inquiry from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\nMessage:\n${formData.message}`
    );
    window.location.href = `mailto:joed@upside-re-development.com?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setFormStatus("success");
      setFormData({ name: "", email: "", phone: "", message: "" });
    }, 800);
  };

  const inputClass = "w-full bg-white/10 border border-white/25 text-white placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors";

  return (
    <div className="min-h-screen bg-white">

      {/* ── NAVIGATION ── */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => scrollTo("hero")}
            className="text-xl font-bold text-black"
          >
            Upside Capital Markets
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-base font-medium text-gray-600 hover:text-black transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Mobile hamburger button */}
          <button
            className="md:hidden p-1 text-gray-700 hover:text-black transition-colors"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE SLIDE-IN MENU ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 md:hidden ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMenuOpen(false)}
      />
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-[70] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <span className="text-lg font-bold text-black">Upside Capital Markets</span>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-1 text-gray-500 hover:text-black transition-colors"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Drawer links */}
        <nav className="flex flex-col px-6 py-6 gap-1">
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-left text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 px-3 py-3 transition-colors"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Drawer CTA */}
        <div className="mt-auto px-6 pb-8">
          <button
            onClick={() => scrollTo("contact")}
            className="w-full bg-black text-white text-sm font-semibold px-6 py-3 hover:bg-gray-800 transition-colors"
          >
            Get Started
          </button>
          <div className="mt-6 flex flex-col gap-2">
            <a href="mailto:joed@upside-re-development.com" className="text-xs text-gray-500 hover:text-black transition-colors truncate">
              joed@upside-re-development.com
            </a>
            <a href="tel:6178940445" className="text-xs text-gray-500 hover:text-black transition-colors">
              617.894.0445
            </a>
            <a
              href="https://www.linkedin.com/company/upsideholds/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors mt-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <section id="hero" className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-9xl font-bold text-black leading-none mb-6 tracking-tight">
            Upside Capital<br />Markets
          </h1>
          <p className="text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Elevating Commercial Real Estate Investments with Unparalleled Expertise and Innovative Strategies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => scrollTo("services")}
              className="bg-black text-white text-base font-semibold px-8 py-4 hover:bg-gray-800 transition-colors"
            >
              Explore Our Services
            </button>
            <button
              onClick={() => scrollTo("contact")}
              className="bg-white text-black text-base font-semibold px-8 py-4 border-2 border-black hover:bg-gray-50 transition-colors"
            >
              Join Our Community
            </button>
          </div>
        </div>
      </section>

      {/* ── INTRO ── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-black mb-16 max-w-3xl mx-auto leading-tight">
            Welcome to the most innovative Capital Markets Commercial Real Estate Platform
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { title: "Comprehensive Expertise", body: "Our team of seasoned professionals brings decades of experience in commercial real estate, capital markets, and investment strategy." },
              { title: "Innovative Approach", body: "We leverage cutting-edge data analytics and market insights to deliver customized solutions that maximize returns for our clients." },
              { title: "Developer-Centric Focus", body: "Our unwavering commitment to our clients' success is the cornerstone of our business. We work tirelessly to empower them to achieve extraordinary results." },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="text-2xl font-bold text-black mb-4">{item.title}</h3>
                <p className="text-base text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-black mb-16 text-center">
            Our Comprehensive Suite of Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((s) => (
              <div key={s.num} className="p-6 border border-gray-100 hover:border-gray-300 transition-colors">
                <div className="text-6xl font-bold text-gray-100 mb-2 leading-none select-none">
                  {s.num}
                </div>
                <h3 className="text-xl font-bold text-black mb-3">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT / VALUES ── */}
      <section id="about" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-black mb-16 text-center">
            Empowering Investors and Developers to Achieve New Heights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {VALUES.map((v) => (
              <div key={v.title} className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-black mb-3">{v.title}</h3>
                <p className="text-base text-gray-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-20 px-6 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-white mb-4">Connect with Us Today</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Ready to elevate your commercial real estate investments? Let's discuss how we can help you achieve extraordinary results.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start max-w-5xl mx-auto">

            {/* Left: contact info */}
            <div>
              <h3 className="text-xl font-bold text-white mb-6">Get in Touch Directly</h3>
              <div className="flex flex-col gap-5 mb-10">
                <a
                  href="mailto:joed@upside-re-development.com"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 border border-white/20 flex items-center justify-center shrink-0 group-hover:border-white/60 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-white transition-colors">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Email</p>
                    <p className="text-sm text-gray-300 group-hover:text-white transition-colors">joed@upside-re-development.com</p>
                  </div>
                </a>
                <a
                  href="tel:6178940445"
                  className="flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 border border-white/20 flex items-center justify-center shrink-0 group-hover:border-white/60 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-white transition-colors">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Phone</p>
                    <p className="text-sm text-gray-300 group-hover:text-white transition-colors">617.894.0445</p>
                  </div>
                </a>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 border border-white/20 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Location</p>
                    <p className="text-sm text-gray-300">Boston, MA · Northeast</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: contact form */}
            <div>
              {formStatus === "success" ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle size={48} className="text-white mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Message Sent</h3>
                  <p className="text-gray-400 text-sm mb-6">Thank you for reaching out. We'll be in touch shortly.</p>
                  <button
                    onClick={() => setFormStatus("idle")}
                    className="text-sm text-gray-400 hover:text-white underline transition-colors"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleFormChange}
                        placeholder="John Smith"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Email *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleFormChange}
                        placeholder="john@company.com"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="617.000.0000"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">How Can We Help? *</label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleFormChange}
                      placeholder="Tell us about your investment goals, project details, or how you'd like to work together..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formStatus === "submitting"}
                    className="w-full bg-white text-black text-sm font-semibold px-8 py-4 hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  >
                    {formStatus === "submitting" ? "Sending..." : "Get Started"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-base font-semibold text-white">Upside Capital Markets</p>
          <a
            href="https://www.linkedin.com/company/upsideholds/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
              <rect x="2" y="9" width="4" height="12"/>
              <circle cx="4" cy="4" r="2"/>
            </svg>
            LinkedIn
          </a>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Upside Capital Markets. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
