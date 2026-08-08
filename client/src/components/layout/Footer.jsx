import { Link } from "react-router-dom";
import { Logo } from "../ui/Logo.jsx";
import { useSiteSettings } from "../../hooks/useSiteSettings.js";

export function Footer() {
  const settings = useSiteSettings();

  return (
    <footer className="mt-24 bg-ink text-gray-300">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <Logo height={44} />
          <p className="mt-3 text-sm text-gray-400">Clean Panels. Better Performance.</p>
          <p className="mt-4 text-sm text-gray-400">{settings.addressLine}</p>
        </div>

        <div>
          <h4 className="font-semibold text-white">Quick Links</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/services" className="hover:text-gold">Services</Link></li>
            <li><Link to="/amc-plans" className="hover:text-gold">AMC Plans</Link></li>
            <li><Link to="/health-audit" className="hover:text-gold">Health Audit</Link></li>
            <li><Link to="/about" className="hover:text-gold">About Us</Link></li>
            <li><Link to="/blog" className="hover:text-gold">Blog</Link></li>
            <li><Link to="/contact" className="hover:text-gold">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white">Legal</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/privacy" className="hover:text-gold">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-gold">Terms of Service</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white">Get in Touch</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`tel:${settings.contactPhone}`} className="hover:text-gold">{settings.contactPhone}</a>
            </li>
            <li>
              <a href={`mailto:${settings.contactEmail}`} className="hover:text-gold">{settings.contactEmail}</a>
            </li>
            <li>
              <a
                href={`https://wa.me/${settings.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold"
              >
                Chat on WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-maroon py-3 text-center text-xs text-gray-200">
        Powered by EaseMyClean Pvt. Ltd. &copy; {new Date().getFullYear()} All rights reserved.
      </div>
    </footer>
  );
}
