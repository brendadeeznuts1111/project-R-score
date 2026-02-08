/**
 * FreshCuts Deep Link Manager - React Component
 * Handles deep link routing and state management for FreshCuts mobile app
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { 
  FreshCutsDeepLink, 
  FreshCutsDeepLinkHandler, 
  FreshCutsDeepLinkParser,
  FreshCutsDeepLinkGenerator
} from './freshcuts-deep-linking';

// Types for deep link context
interface DeepLinkContextType {
  currentLink: FreshCutsDeepLink | null;
  isLoading: boolean;
  error: string | null;
  handleDeepLink: (url: string) => Promise<void>;
  clearLink: () => void;
  generateLink: (action: string, params: any) => string;
}

// Create context for deep link state
const DeepLinkContext = createContext<DeepLinkContextType | null>(null);

// Props for Deep Link Manager component
interface FreshCutsDeepLinkManagerProps {
  children: React.ReactNode;
  venmoGateway: any;
  onPaymentCreated?: (payment: any) => void;
  onBookingInitiated?: (booking: any) => void;
  onTipCreated?: (tip: any) => void;
  onNavigation?: (route: string, params: any) => void;
}

// Deep Link Manager Component
export const FreshCutsDeepLinkManager: React.FC<FreshCutsDeepLinkManagerProps> = ({
  children,
  venmoGateway,
  onPaymentCreated,
  onBookingInitiated,
  onTipCreated,
  onNavigation
}) => {
  const [currentLink, setCurrentLink] = useState<FreshCutsDeepLink | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handler] = useState(() => new FreshCutsDeepLinkHandler(venmoGateway));

  // Handle deep link processing
  const handleDeepLink = useCallback(async (url: string) => {
    console.log('🔗 Processing deep link:', url);
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await handler.handleDeepLink(url);
      setCurrentLink(FreshCutsDeepLinkParser.parse(url));

      // Route result to appropriate handler
      switch (result.type) {
        case 'payment':
          if (result.action === 'created' && onPaymentCreated) {
            onPaymentCreated(result.data);
          }
          break;
        
        case 'booking':
          if (onBookingInitiated) {
            onBookingInitiated(result.data);
          }
          break;
        
        case 'tip':
          if (result.action === 'created' && onTipCreated) {
            onTipCreated(result.data);
          } else if (result.action === 'prompt' && onNavigation) {
            onNavigation('/tip-prompt', result.data);
          }
          break;
        
        case 'shop':
        case 'barber':
        case 'profile':
          if (onNavigation) {
            onNavigation(result.data.url, result.params);
          }
          break;
        
        case 'review':
          if (onNavigation) {
            onNavigation(result.data.url, result.params);
          }
          break;
        
        case 'promotions':
          if (onNavigation) {
            onNavigation('/promotions', { code: result.data.promoCode });
          }
          break;
        
        default:
          console.log('Unhandled deep link type:', result.type);
      }

      console.log('✅ Deep link processed successfully:', result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Deep link processing failed:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [handler, onPaymentCreated, onBookingInitiated, onTipCreated, onNavigation]);

  // Clear current link
  const clearLink = useCallback(() => {
    setCurrentLink(null);
    setError(null);
  }, []);

  // Generate deep link
  const generateLink = useCallback((action: string, params: any) => {
    switch (action) {
      case 'payment':
        return FreshCutsDeepLinkGenerator.payment(params);
      case 'booking':
        return FreshCutsDeepLinkGenerator.booking(params);
      case 'tip':
        return FreshCutsDeepLinkGenerator.tip(params);
      case 'shop':
        return FreshCutsDeepLinkGenerator.shop(params.shopId);
      case 'barber':
        return FreshCutsDeepLinkGenerator.barber(params.barberId);
      case 'review':
        return FreshCutsDeepLinkGenerator.review(params.appointmentId);
      case 'promotions':
        return FreshCutsDeepLinkGenerator.promotions(params.promoCode);
      case 'profile':
        return FreshCutsDeepLinkGenerator.profile(params.userId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }, []);

  // Listen for deep links (app launched from URL)
  useEffect(() => {
    // Handle initial URL if app was launched with deep link
    const handleInitialURL = () => {
      // In a real app, this would come from the native layer
      // For demo purposes, we'll check localStorage or URL params
      const initialURL = localStorage.getItem('freshcuts_deep_link');
      if (initialURL) {
        handleDeepLink(initialURL);
        localStorage.removeItem('freshcuts_deep_link');
      }
    };

    handleInitialURL();

    // Listen for deep link events (would come from native bridge)
    const handleDeepLinkEvent = (event: any) => {
      if (event.detail && event.detail.url) {
        handleDeepLink(event.detail.url);
      }
    };

    window.addEventListener('freshcuts-deep-link', handleDeepLinkEvent);
    
    return () => {
      window.removeEventListener('freshcuts-deep-link', handleDeepLinkEvent);
    };
  }, [handleDeepLink]);

  const contextValue: DeepLinkContextType = {
    currentLink,
    isLoading,
    error,
    handleDeepLink,
    clearLink,
    generateLink
  };

  return (
    <DeepLinkContext.Provider value={contextValue}>
      {children}
    </DeepLinkContext.Provider>
  );
};

// Hook to use deep link context
export const useFreshCutsDeepLink = () => {
  const context = useContext(DeepLinkContext);
  if (!context) {
    throw new Error('useFreshCutsDeepLink must be used within FreshCutsDeepLinkManager');
  }
  return context;
};

// Deep Link Status Component
export const DeepLinkStatus: React.FC = () => {
  const { currentLink, isLoading, error, clearLink } = useFreshCutsDeepLink();

  if (!currentLink && !isLoading && !error) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {isLoading && (
        <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            <span>Processing deep link...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Deep Link Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={clearLink}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {currentLink && !isLoading && !error && (
        <div className="bg-green-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Deep Link Active</p>
              <p className="text-sm">
                {currentLink.action} - {Object.keys(currentLink.params).length} parameters
              </p>
            </div>
            <button
              onClick={clearLink}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Deep Link Generator Component
export const DeepLinkGenerator: React.FC = () => {
  const { generateLink } = useFreshCutsDeepLink();
  const [linkType, setLinkType] = useState('payment');
  const [params, setParams] = useState({});
  const [generatedLink, setGeneratedLink] = useState('');

  const handleGenerate = () => {
    try {
      const link = generateLink(linkType, params);
      setGeneratedLink(link);
    } catch (error) {
      console.error('Failed to generate link:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      alert('Deep link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Generate Deep Link</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Link Type
        </label>
        <select
          value={linkType}
          onChange={(e) => setLinkType(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="payment">Payment</option>
          <option value="booking">Booking</option>
          <option value="tip">Tip</option>
          <option value="shop">Shop</option>
          <option value="barber">Barber</option>
          <option value="review">Review</option>
          <option value="promotions">Promotions</option>
          <option value="profile">Profile</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parameters (JSON)
        </label>
        <textarea
          value={JSON.stringify(params, null, 2)}
          onChange={(e) => {
            try {
              setParams(JSON.parse(e.target.value));
            } catch {
              // Invalid JSON, ignore
            }
          }}
          className="w-full p-2 border border-gray-300 rounded-md h-24 font-mono text-sm"
          placeholder='{"amount": 45, "shop": "nyc_01"}'
        />
      </div>

      <button
        onClick={handleGenerate}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 mb-2"
      >
        Generate Link
      </button>

      {generatedLink && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generated Link
          </label>
          <div className="flex">
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="flex-1 p-2 border border-gray-300 rounded-l-md bg-gray-50 font-mono text-sm"
            />
            <button
              onClick={handleCopy}
              className="bg-gray-500 text-white px-4 py-2 rounded-r-md hover:bg-gray-600"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Example usage component
export const DeepLinkExamples: React.FC = () => {
  const { handleDeepLink } = useFreshCutsDeepLink();

  const examples = [
    {
      name: 'Payment Link',
      url: 'freshcuts://payment?amount=45&shop=nyc_01',
      description: 'Create a $45 payment at NYC shop'
    },
    {
      name: 'Booking Link',
      url: 'freshcuts://booking?barber=jb',
      description: 'Book with barber JB'
    },
    {
      name: 'Tip Link',
      url: 'freshcuts://tip?barber=jb&amount=10',
      description: 'Send $10 tip to barber JB'
    },
    {
      name: 'Shop Link',
      url: 'freshcuts://shop?shop=nyc_01',
      description: 'Navigate to NYC shop'
    },
    {
      name: 'Barber Link',
      url: 'freshcuts://barber?barber=jb',
      description: 'View barber JB profile'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Deep Link Examples</h2>
      
      <div className="space-y-4">
        {examples.map((example, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-1">{example.name}</h3>
            <p className="text-gray-600 text-sm mb-2">{example.description}</p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-gray-100 p-2 rounded text-sm font-mono">
                {example.url}
              </code>
              <button
                onClick={() => handleDeepLink(example.url)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FreshCutsDeepLinkManager;
