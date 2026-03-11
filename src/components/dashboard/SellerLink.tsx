import { ExternalLink } from "lucide-react";

interface SellerLinkProps {
  name: string;
  custId?: string;
  className?: string;
}

/**
 * Renders a seller name as a clickable link to Mercado Livre's seller page.
 * Falls back to plain text if custId is not available.
 */
const SellerLink = ({ name, custId, className = "" }: SellerLinkProps) => {
  if (!custId) {
    return <span className={className}>{name}</span>;
  }

  return (
    <a
      href={`https://lista.mercadolivre.com.br/_CustId_${custId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-primary hover:text-blue-400 hover:underline transition-colors ${className}`}
    >
      {name}
      <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
    </a>
  );
};

export default SellerLink;
