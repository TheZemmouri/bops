/**
 * Installer.report Provider Adapter Interfaces
 * 
 * Pluggable adapters for AI generation providers.
 * Each provider has a consistent interface for generation operations.
 * 
 * Set API keys via environment variables:
 * - HIGGSFIELD_API_KEY
 * - KREA_API_KEY
 * - RUNWAY_API_KEY
 * - LUMA_API_KEY
 * - KLING_API_KEY
 * - ELEVENLABS_API_KEY
 */

export interface GenerationRequest {
  prompt: string;
  sourceAsset?: string; // URL or file path for video-to-video
  style?: string;
  duration?: number; // seconds
  width?: number;
  height?: number;
  parameters?: Record<string, unknown>; // Provider-specific params
}

export interface GenerationResult {
  success: boolean;
  outputUrls: string[];
  costCents: number;
  units?: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface ProviderAdapter {
  readonly name: string;
  readonly capabilities: {
    videoGeneration: boolean;
    imageGeneration: boolean;
    audioGeneration: boolean;
    styleTransfer: boolean;
    upscaling: boolean;
  };
  
  /**
   * Check if provider is configured (API key present)
   */
  isConfigured(): boolean;
  
  /**
   * Generate content using this provider
   */
  generate(request: GenerationRequest): Promise<GenerationResult>;
  
  /**
   * Get cost estimate for a generation request
   */
  estimateCost(request: GenerationRequest): Promise<number>; // cents
  
  /**
   * Check generation status (for async operations)
   */
  checkStatus?(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number; // 0-100
    result?: GenerationResult;
  }>;
}

/**
 * Base adapter implementation with common functionality
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly name: string;
  abstract readonly capabilities: ProviderAdapter['capabilities'];
  
  protected abstract getApiKey(): string | undefined;
  
  isConfigured(): boolean {
    return !!this.getApiKey();
  }
  
  abstract generate(request: GenerationRequest): Promise<GenerationResult>;
  abstract estimateCost(request: GenerationRequest): Promise<number>;
  
  protected handleError(error: unknown): GenerationResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      outputUrls: [],
      costCents: 0,
      error: message,
    };
  }
}

/**
 * Higgsfield adapter (stub implementation)
 */
export class HiggsfieldAdapter extends BaseProviderAdapter {
  readonly name = 'higgsfield';
  readonly capabilities = {
    videoGeneration: true,
    imageGeneration: true,
    audioGeneration: true,
    styleTransfer: true,
    upscaling: true,
  };
  
  protected getApiKey() {
    return process.env.HIGGSFIELD_API_KEY;
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      return this.handleError(new Error('Higgsfield API key not configured'));
    }
    
    // TODO: Implement actual Higgsfield API calls
    // This is a stub implementation
    console.log('[Higgsfield] Generate request:', request);
    
    return {
      success: false,
      outputUrls: [],
      costCents: 0,
      error: 'Higgsfield adapter not yet implemented',
    };
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    // Stub: return estimated cost based on duration/complexity
    const baseCost = request.duration ? request.duration * 100 : 500; // $1 per second or $5 base
    return baseCost;
  }
}

/**
 * Krea adapter (stub implementation)
 */
export class KreaAdapter extends BaseProviderAdapter {
  readonly name = 'krea';
  readonly capabilities = {
    videoGeneration: true,
    imageGeneration: true,
    audioGeneration: false,
    styleTransfer: true,
    upscaling: true,
  };
  
  protected getApiKey() {
    return process.env.KREA_API_KEY;
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      return this.handleError(new Error('Krea API key not configured'));
    }
    
    // TODO: Implement actual Krea API calls
    console.log('[Krea] Generate request:', request);
    
    return {
      success: false,
      outputUrls: [],
      costCents: 0,
      error: 'Krea adapter not yet implemented',
    };
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    return request.sourceAsset ? 300 : 200; // $3 for style transfer, $2 for generation
  }
}

/**
 * Runway adapter (stub implementation)
 */
export class RunwayAdapter extends BaseProviderAdapter {
  readonly name = 'runway';
  readonly capabilities = {
    videoGeneration: true,
    imageGeneration: true,
    audioGeneration: false,
    styleTransfer: true,
    upscaling: true,
  };
  
  protected getApiKey() {
    return process.env.RUNWAY_API_KEY;
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      return this.handleError(new Error('Runway API key not configured'));
    }
    
    // TODO: Implement actual Runway API calls
    console.log('[Runway] Generate request:', request);
    
    return {
      success: false,
      outputUrls: [],
      costCents: 0,
      error: 'Runway adapter not yet implemented',
    };
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    return (request.duration || 5) * 150; // $1.50 per second
  }
}

/**
 * Luma adapter (stub implementation)
 */
export class LumaAdapter extends BaseProviderAdapter {
  readonly name = 'luma';
  readonly capabilities = {
    videoGeneration: true,
    imageGeneration: false,
    audioGeneration: false,
    styleTransfer: false,
    upscaling: false,
  };
  
  protected getApiKey() {
    return process.env.LUMA_API_KEY;
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      return this.handleError(new Error('Luma API key not configured'));
    }
    
    // TODO: Implement actual Luma API calls
    console.log('[Luma] Generate request:', request);
    
    return {
      success: false,
      outputUrls: [],
      costCents: 0,
      error: 'Luma adapter not yet implemented',
    };
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    return 400; // $4 per generation
  }
}

/**
 * Kling adapter (stub implementation)
 */
export class KlingAdapter extends BaseProviderAdapter {
  readonly name = 'kling';
  readonly capabilities = {
    videoGeneration: true,
    imageGeneration: false,
    audioGeneration: false,
    styleTransfer: true,
    upscaling: false,
  };
  
  protected getApiKey() {
    return process.env.KLING_API_KEY;
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      return this.handleError(new Error('Kling API key not configured'));
    }
    
    // TODO: Implement actual Kling API calls
    console.log('[Kling] Generate request:', request);
    
    return {
      success: false,
      outputUrls: [],
      costCents: 0,
      error: 'Kling adapter not yet implemented',
    };
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    return (request.duration || 5) * 120; // $1.20 per second
  }
}

/**
 * ElevenLabs adapter (stub implementation)
 */
export class ElevenLabsAdapter extends BaseProviderAdapter {
  readonly name = 'elevenlabs';
  readonly capabilities = {
    videoGeneration: false,
    imageGeneration: false,
    audioGeneration: true,
    styleTransfer: false,
    upscaling: false,
  };
  
  protected getApiKey() {
    return process.env.ELEVENLABS_API_KEY;
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      return this.handleError(new Error('ElevenLabs API key not configured'));
    }
    
    // TODO: Implement actual ElevenLabs API calls
    console.log('[ElevenLabs] Generate request:', request);
    
    return {
      success: false,
      outputUrls: [],
      costCents: 0,
      error: 'ElevenLabs adapter not yet implemented',
    };
  }
  
  async estimateCost(_request: GenerationRequest): Promise<number> {
    const characters = _request.prompt.length;
    return Math.ceil(characters / 100) * 10; // ~$0.10 per 100 characters
  }
}

/**
 * Provider registry
 */
export const PROVIDERS: Record<string, ProviderAdapter> = {
  higgsfield: new HiggsfieldAdapter(),
  krea: new KreaAdapter(),
  runway: new RunwayAdapter(),
  luma: new LumaAdapter(),
  kling: new KlingAdapter(),
  elevenlabs: new ElevenLabsAdapter(),
};

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): ProviderAdapter[] {
  return Object.values(PROVIDERS).filter((p) => p.isConfigured());
}

/**
 * Get provider by name
 */
export function getProvider(name: string): ProviderAdapter | undefined {
  return PROVIDERS[name];
}

/**
 * Get the best provider for a given capability
 */
export function getProviderForCapability(
  capability: keyof ProviderAdapter['capabilities']
): ProviderAdapter | undefined {
  const providers = getConfiguredProviders().filter(
    (p) => p.capabilities[capability]
  );
  
  // Return first configured provider with this capability
  // TODO: Add provider selection logic (cost, speed, quality preferences)
  return providers[0];
}
