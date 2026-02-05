/**
 * Cover-Stardust™ - Sprinkles believable story-dust on every trail
 * Creates iPhone, PS5, MacBook constellations for cover stories
 */

export interface CoverStory {
  good: string;
  story: string;
  stardustLevel: number; // 1-10, how believable
  price: number;
  marketplace: string;
  seller: string;
  timestamp: Date;
}

export interface StardustParams {
  targetGood: string;
  orbits: string[];
  riskLevel: 'low' | 'medium' | 'high';
  nebulaGoods: string[];
}

export class CoverStardust {
  private readonly MARKETPLACES = [
    'eBay',
    'Facebook Marketplace', 
    'OfferUp',
    'Mercari',
    'Poshmark',
    'Grailed',
    'StockX'
  ];

  private readonly SELLER_PROFILES = [
    'TechEnthusiast92',
    'GadgetGuru_Al',
    'DigitalNomad_Sam',
    'MobileTech_Deals',
    'PremiumDevices_Store',
    'AppleSpecialist_Jess',
    'GamingGear_Pro',
    'ElectronicsHub_Official'
  ];

  private readonly STORY_TEMPLATES = {
    'iPhone': [
      'Selling my upgrade - phone is in pristine condition, always used with case and screen protector',
      'Got this as a gift, already have one - brand new sealed in box',
      'Work phone upgrade - barely used, battery health 98%',
      'Switching to Android - selling my immaculate iPhone',
      'Extra device from family plan - like new condition'
    ],
    'PS5': [
      'Barely played - too busy with work, console is basically new',
      'Got as birthday gift but prefer PC gaming',
      'Moving abroad soon, need to sell quickly',
      'Second console for bedroom - decided to keep only one',
      'Won in company raffle - already have a PS5'
    ],
    'MacBook': [
      'Work provided new laptop, selling personal one',
      'Upgraded to M3 for video editing, this one still perfect for daily use',
      'College graduation gift - ended up getting desktop instead',
      'Freelance work ended, no longer need portable workstation',
      'Got thinner model for travel, selling this backup'
    ],
    'iPad': [
      'Kids prefer Android tablets, selling this iPad',
      'Got larger iPad Pro for art, this one is perfect for media',
      'Work provided tablet, no longer need personal one',
      'Upgraded to cellular model, selling WiFi version',
      'Barely used - mostly watched Netflix on TV'
    ],
    'AirPods': [
      'Upgraded to AirPods Pro, selling these standard ones',
      'Got as gift but prefer over-ear headphones',
      'Work provided better headphones, selling these',
      'Bought for gym but never ended up using',
      'Extra pair from family plan - brand new'
    ]
  };

  /**
   * Generate believable cover stories for nebula goods
   */
  async generateCover(params: StardustParams): Promise<{
    coverStories: CoverStory[];
  }> {
    console.log(`✨ Cover-Stardust™: Generating stories for ${params.targetGood}`);

    const coverStories: CoverStory[] = [];
    
    // Generate one cover story per orbit (or subset for high risk)
    const storyCount = params.riskLevel === 'high' ? Math.min(params.orbits.length, 3) : params.orbits.length;
    
    for (let i = 0; i < storyCount; i++) {
      const story = await this.createCoverStory(params.targetGood, params.riskLevel, i);
      coverStories.push(story);
    }

    console.log(`🌟 Generated ${coverStories.length} cover stories with avg stardust level: ${this.calculateAverageStardust(coverStories)}`);
    
    return { coverStories };
  }

  /**
   * Create individual cover story
   */
  private async createCoverStory(good: string, riskLevel: string, index: number): Promise<CoverStory> {
    const marketplace = this.MARKETPLACES[Math.floor(Math.random() * this.MARKETPLACES.length)];
    const seller = this.SELLER_PROFILES[Math.floor(Math.random() * this.SELLER_PROFILES.length)];
    const templates = this.STORY_TEMPLATES[good as keyof typeof this.STORY_TEMPLATES] || this.STORY_TEMPLATES['iPhone'];
    const story = templates[Math.floor(Math.random() * templates.length)];
    
    // Calculate price based on good and market value
    const basePrice = this.getBasePrice(good);
    const variance = riskLevel === 'high' ? 0.3 : riskLevel === 'medium' ? 0.2 : 0.1;
    const price = basePrice * (1 + (Math.random() - 0.5) * variance);
    
    // Stardust level: higher for lower risk, more believable stories
    const stardustLevel = riskLevel === 'high' ? 
      Math.floor(Math.random() * 3) + 6 : // 6-8 for high risk
      riskLevel === 'medium' ? 
      Math.floor(Math.random() * 3) + 7 : // 7-9 for medium risk
      Math.floor(Math.random() * 2) + 8; // 8-9 for low risk

    return {
      good,
      story,
      stardustLevel,
      price: parseFloat(price.toFixed(2)),
      marketplace,
      seller,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
    };
  }

  /**
   * Get base market price for goods
   */
  private getBasePrice(good: string): number {
    const prices = {
      'iPhone': 899,
      'PS5': 499,
      'MacBook': 1299,
      'iPad': 599,
      'AirPods': 179
    };
    
    return prices[good as keyof typeof prices] || 500;
  }

  /**
   * Calculate average stardust level
   */
  private calculateAverageStardust(stories: CoverStory[]): number {
    const total = stories.reduce((sum, story) => sum + story.stardustLevel, 0);
    return parseFloat((total / stories.length).toFixed(1));
  }

  /**
   * Validate cover story quality
   */
  validateCoverStory(story: CoverStory): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    
    // Check stardust level
    if (story.stardustLevel < 6) {
      issues.push('Stardust level too low - story may not be believable');
    }
    
    // Check price variance
    const expectedPrice = this.getBasePrice(story.good);
    const priceVariance = Math.abs(story.price - expectedPrice) / expectedPrice;
    if (priceVariance > 0.4) {
      issues.push('Price variance too high - may attract attention');
    }
    
    // Check story length
    if (story.story.length < 20) {
      issues.push('Story too short - lacks detail');
    }
    
    // Check marketplace appropriateness
    const highValueMarkets = ['StockX', 'Grailed'];
    if (story.price > 1000 && !highValueMarkets.includes(story.marketplace)) {
      issues.push('High-value item should use premium marketplace');
    }
    
    const score = Math.max(0, 10 - issues.length - (10 - story.stardustLevel) / 2);
    
    return {
      isValid: issues.length === 0,
      issues,
      score: parseFloat(score.toFixed(1))
    };
  }

  /**
   * Get stardust statistics
   */
  getStardustStats(stories: CoverStory[]): {
    totalStories: number;
    averageStardustLevel: number;
    averagePrice: number;
    marketplaceDistribution: Record<string, number>;
    goodDistribution: Record<string, number>;
  } {
    const totalStories = stories.length;
    const avgStardust = stories.reduce((sum, story) => sum + story.stardustLevel, 0) / totalStories;
    const avgPrice = stories.reduce((sum, story) => sum + story.price, 0) / totalStories;
    
    const marketplaceDist: Record<string, number> = {};
    const goodDist: Record<string, number> = {};
    
    stories.forEach(story => {
      marketplaceDist[story.marketplace] = (marketplaceDist[story.marketplace] || 0) + 1;
      goodDist[story.good] = (goodDist[story.good] || 0) + 1;
    });

    return {
      totalStories,
      averageStardustLevel: parseFloat(avgStardust.toFixed(1)),
      averagePrice: parseFloat(avgPrice.toFixed(2)),
      marketplaceDistribution: marketplaceDist,
      goodDistribution: goodDist
    };
  }
}
