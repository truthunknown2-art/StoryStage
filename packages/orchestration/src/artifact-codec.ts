export interface ArtifactCodec<T> {
  parse(value: unknown): T;
  contentHash(value: T): string;
}
