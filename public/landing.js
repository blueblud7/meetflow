import { applyTranslations, getLocale, setLocale } from "./i18n.js";

const localeButtons = document.querySelectorAll(".locale-toggle");

applyTranslations();
syncLocaleToggle();

localeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLocale(button.dataset.locale);
    applyTranslations();
    syncLocaleToggle();
  });
});

function syncLocaleToggle() {
  const locale = getLocale();
  localeButtons.forEach((button) => {
    const isActive = button.dataset.locale === locale;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}
