import wordmark from "@/assets/ecom-solutions-wordmark.png.asset.json";

/** Original supplied lettering; the eagle is owned by each surrounding header. */
export default function MarcaEcom({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`ecom-wordmark${compact ? " ecom-wordmark-compact" : ""}`}>
      <img
        src={new URL(wordmark.url, "https://ecomperegrinus.com.br").href}
        alt="ecom solutions"
        width={301}
        height={135}
        className="ecom-wordmark-image brightness-0 dark:invert"
        decoding="async"
      />
      <span className="ecom-wordmark-signature">by Peregrinus</span>
    </span>
  );
}