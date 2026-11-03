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
 * Higgsfield adapter
 * API docs: https://docs.higgsfield.ai
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
  
  private readonly apiBase = 'https://api.higgsfield.ai/v1';
  
  protected getApiKey() {
    return process.env.HIGGSFIELD_API_KEY;
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      return this.handleError(new Error('Higgsfield API key not configured. Set HIGGSFIELD_API_KEY.'));
    }
    
    try {
      // Determine operation type
      const operation = request.sourceAsset ? 'video-to-video' : 'text-to-video';
      
      // Submit generation request
      const response = await fetch(`${this.apiBase}/generate/${operation}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          source_video: request.sourceAsset,
          style: request.style,
          duration: request.duration || 5,
          width: request.width || 1920,
          height: request.height || 1080,
          ...request.parameters,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Higgsfield API error: ${response.status} - ${error}`);
      }
      
      const data = await response.json();
      
      // Poll for completion if async
      if (data.job_id) {
        const result = await this.pollJob(data.job_id);
        return result;
      }
      
      // Synchronous response
      return {
        success: true,
        outputUrls: [data.output_url || data.url],
        costCents: Math.round((data.cost || 0) * 100),
        metadata: data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  private async pollJob(jobId: string, maxAttempts = 60): Promise<GenerationResult> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
      
      const response = await fetch(`${this.apiBase}/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.getApiKey()}`,
        },
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.status === 'completed') {
        return {
          success: true,
          outputUrls: Array.isArray(data.outputs) ? data.outputs : [data.output_url],
          costCents: Math.round((data.cost || 0) * 100),
          metadata: data,
        };
      }
      
      if (data.status === 'failed') {
        return this.handleError(new Error(data.error || 'Generation failed'));
      }
    }
    
    return this.handleError(new Error('Generation timeout'));
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    const baseCost = request.duration ? request.duration * 100 : 500;
    const hasSource = request.sourceAsset ? 1.5 : 1; // Style transfer costs more
    return Math.round(baseCost * hasSource);
  }
  
  async checkStatus(jobId: string) {
    if (!this.isConfigured()) {
      throw new Error('Higgsfield API key not configured');
    }
    
    const response = await fetch(`${this.apiBase}/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      status: data.status === 'completed' ? 'completed' as const
        : data.status === 'failed' ? 'failed' as const
        : data.status === 'processing' ? 'processing' as const
        : 'pending' as const,
      progress: data.progress || 0,
      result: data.status === 'completed' ? {
        success: true,
        outputUrls: [data.output_url],
        costCents: Math.round((data.cost || 0) * 100),
        metadata: data,
      } : undefined,
    };
  }
}

/**
 * Krea adapter
 * API docs: https://docs.krea.ai
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
  
  private readonly apiBase = 'https://api.krea.ai/v1';
  
  protected getApiKey() {
    return process.env.KREA_API_KEY;
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      return this.handleError(new Error('Krea API key not configured. Set KREA_API_KEY.'));
    }
    
    try {
      // Choose endpoint based on request type
      const endpoint = request.sourceAsset
        ? '/enhance/video'
        : request.duration
        ? '/generate/video'
        : '/generate/image';
      
      const response = await fetch(`${this.apiBase}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          input_media: request.sourceAsset,
          style_preset: request.style,
          width: request.width || 1024,
          height: request.height || 1024,
          num_frames: request.duration ? Math.round(request.duration * 24) : undefined,
          ...request.parameters,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Krea API error: ${response.status} - ${error}`);
      }
      
      const data = await response.json();
      
      // Krea returns results immediately or with job ID
      if (data.images || data.videos) {
        return {
          success: true,
          outputUrls: data.images || data.videos || [],
          costCents: Math.round((data.credits_used || 0) * 10), // Assume 1 credit = $0.10
          metadata: data,
        };
      }
      
      // Async job
      if (data.id) {
        return await this.pollKreaJob(data.id);
      }
      
      throw new Error('Unexpected response format from Krea');
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  private async pollKreaJob(jobId: string, maxAttempts = 30): Promise<GenerationResult> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      
      const response = await fetch(`${this.apiBase}/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.getApiKey()}`,
        },
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.status === 'succeeded') {
        return {
          success: true,
          outputUrls: data.outputs || data.images || data.videos || [],
          costCents: Math.round((data.credits_used || 0) * 10),
          metadata: data,
        };
      }
      
      if (data.status === 'failed') {
        return this.handleError(new Error(data.error || 'Generation failed'));
      }
    }
    
    return this.handleError(new Error('Generation timeout'));
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    // Krea pricing: ~$0.20 for images, ~$0.30 for style transfer, ~$2 for video
    if (request.duration) return 200; // Video
    return request.sourceAsset ? 30 : 20; // Style transfer or image
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
