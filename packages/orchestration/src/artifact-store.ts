export type HashBoundArtifact = { contentHash: string };

export interface ArtifactByHashStore {
  put<T extends HashBoundArtifact>(artifact: T): Promise<void>;
  get<T extends HashBoundArtifact>(contentHash: string): Promise<T | null>;
  has(contentHash: string): Promise<boolean>;
}

export class MemoryArtifactByHashStore implements ArtifactByHashStore {
  private readonly artifacts = new Map<string, HashBoundArtifact>();

  async put<T extends HashBoundArtifact>(artifact: T): Promise<void> {
    const existing = this.artifacts.get(artifact.contentHash);
    if (existing && JSON.stringify(existing) !== JSON.stringify(artifact))
      throw new Error(
        `Artifact hash collision for ${artifact.contentHash}. Refusing replacement.`,
      );
    this.artifacts.set(artifact.contentHash, structuredClone(artifact));
  }

  async get<T extends HashBoundArtifact>(
    contentHash: string,
  ): Promise<T | null> {
    const artifact = this.artifacts.get(contentHash);
    return artifact ? (structuredClone(artifact) as T) : null;
  }

  async has(contentHash: string): Promise<boolean> {
    return this.artifacts.has(contentHash);
  }
}
