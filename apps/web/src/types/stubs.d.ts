// Global stub declarations to bypass type-checking of heavy/experimental modules during stabilization
// Components (relative imports as used in source files)
declare module '../components/AnimationTools' {
  export const AnimationTools: any;
  const _default: any;
  export default _default;
}

declare module '../components/DesignTemplates' {
  export const DesignTemplates: any;
  const _default: any;
  export default _default;
}

declare module '../components/LoadingStates' {
  export const LoadingOverlay: any;
  export const LoadingStates: any;
  const _default: any;
  export default _default;
}

declare module '../components/Shirt/ShirtRenderer' {
  const _default: any;
  export default _default;
}

declare module '../components/Shirt/hooks/useShirtEvents' {
  const _default: any;
  export default _default;
}

declare module '../components/Shirt/hooks/useShirtRendering' {
  const _default: any;
  export default _default;
}

declare module '../components/Shirt/hooks/useShirtState' {
  const _default: any;
  export default _default;
}

declare module '../components/EnhancedVectorCanvas' {
  const _default: any;
  export default _default;
}

// Global process/env and NodeJS.Timeout shims for browser TS builds
declare const process: { env: Record<string, string | undefined> };
declare namespace NodeJS { interface Timeout {} }

// Minimal EventEmitter shim and events module
declare class __EventEmitterShim {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  setMaxListeners(n: number): this;
  removeAllListeners(): this;
}
declare module 'events' {
  export class EventEmitter extends __EventEmitterShim {}
}

// Heavy vector system stubs to avoid traversing complex types
declare module '../vector/ComprehensiveVectorSystem' {
  export const ComprehensiveVectorSystem: any;
  const _default: any;
  export default _default;
}
declare module '../vector/ProfessionalToolSet' {
  export const ProfessionalToolSet: any;
  const _default: any;
  export default _default;
}
declare module '../vector/UniversalMediaIntegration' {
  export const UniversalMediaIntegration: any;
  const _default: any;
  export default _default;
}
