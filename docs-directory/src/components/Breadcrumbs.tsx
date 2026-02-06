import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
      <a
        href="#"
        className="flex items-center space-x-1 hover:text-cloudflare-orange transition-colors"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <Home className="w-4 h-4" />
        <span>Home</span>
      </a>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4" />
          {item.href ? (
            <a
              href={item.href}
              className="hover:text-cloudflare-orange transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
