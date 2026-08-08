import { useSiteSettings } from "../../hooks/useSiteSettings.js";

export function WhatsAppButton({ message = "Hi EaseMyClean, I'd like to know more about your solar cleaning services." }) {
  const settings = useSiteSettings();
  const href = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.699 4.61 1.902 6.478L4 29l7.72-1.865A11.94 11.94 0 0016.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3zm0 21.818c-1.984 0-3.85-.58-5.412-1.578l-.388-.244-4.583 1.107 1.15-4.465-.253-.395A9.77 9.77 0 016.182 15c0-5.42 4.4-9.818 9.819-9.818S25.818 9.58 25.818 15 21.42 24.818 16.001 24.818zm5.4-7.34c-.296-.148-1.75-.864-2.022-.963-.271-.099-.469-.148-.667.148-.198.296-.766.963-.939 1.161-.173.198-.346.223-.642.075-.296-.148-1.249-.46-2.379-1.468-.879-.784-1.472-1.753-1.645-2.049-.173-.296-.018-.456.13-.604.134-.133.296-.346.444-.519.148-.173.198-.297.297-.494.099-.198.05-.371-.025-.519-.074-.148-.667-1.609-.914-2.204-.24-.578-.485-.5-.667-.51l-.568-.01c-.198 0-.519.074-.79.371-.271.296-1.038 1.014-1.038 2.475s1.063 2.87 1.211 3.068c.148.198 2.093 3.196 5.073 4.482.709.306 1.262.489 1.693.626.711.226 1.358.194 1.869.118.57-.085 1.75-.716 1.997-1.407.247-.692.247-1.285.173-1.407-.074-.123-.271-.198-.567-.346z" />
      </svg>
    </a>
  );
}
