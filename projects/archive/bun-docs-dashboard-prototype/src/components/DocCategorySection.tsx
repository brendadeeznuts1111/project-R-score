import { DocCategory } from '../types';
import DocCard from './DocCard';

interface DocCategoryProps {
  category: DocCategory;
}

export default function DocCategorySection({ category }: DocCategoryProps) {
  return (
    <div className="mb-12 animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {category.name}
          </h2>
          {category.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {category.description}
            </p>
          )}
        </div>
        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-full">
          {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {category.items.map((item) => (
          <DocCard 
            key={item.id} 
            item={item} 
            category={category.name}
          />
        ))}
      </div>
    </div>
  );
}
