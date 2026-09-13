declare module 'mp4box' {
  export interface MP4MediaTrack {
    id: number;
    type?: string;
    codec: string;
    timescale: number;
    duration: number;
    nb_samples: number;
    track_width?: number;
    track_height?: number;
    video?: { width: number; height: number };
    audio?: { sample_rate: number; channel_count: number };
  }

  export interface MP4Info {
    duration: number;
    timescale: number;
    isFragmented: boolean;
    brands: string[];
    tracks: MP4MediaTrack[];
    videoTracks?: MP4MediaTrack[];
    audioTracks?: MP4MediaTrack[];
  }

  export interface MP4Sample {
    number: number;
    track_id: number;
    timescale: number;
    description_index: number;
    is_sync: boolean;
    cts: number;
    dts: number;
    duration: number;
    size: number;
    data: Uint8Array;
  }

  export interface MP4ArrayBuffer extends ArrayBuffer {
    fileStart: number;
  }

  export interface MP4Box {
    write(stream: MP4BoxDataStream): void;
    [key: string]: unknown;
  }

  export interface MP4BoxDataStream {
    buffer: ArrayBuffer;
    [key: string]: unknown;
  }

  export interface MP4ExtractionOptions {
    nbSamples?: number;
    rapAlignement?: boolean;
  }

  export interface MP4File {
    onReady?: (info: MP4Info) => void;
    onError?: (error: string) => void;
    onSamples?: (id: number, user: unknown, samples: MP4Sample[]) => void;
    appendBuffer(data: MP4ArrayBuffer): number;
    start(): void;
    stop(): void;
    flush(): void;
    releaseUsedSamples(id: number, sampleNumber: number): void;
    setExtractionOptions(id: number, user?: unknown, options?: MP4ExtractionOptions): void;
    getTrackById(id: number): {
      mdia: { minf: { stbl: { stsd: { entries: Record<string, MP4Box | undefined>[] } } } };
    };
  }

  export function createFile(): MP4File;

  export const DataStream: {
    new (arrayBuffer?: ArrayBuffer, byteOffset?: number, endianness?: boolean): MP4BoxDataStream;
    BIG_ENDIAN: boolean;
    LITTLE_ENDIAN: boolean;
  };

  const MP4BoxModule: {
    createFile: typeof createFile;
    DataStream: typeof DataStream;
  };

  export default MP4BoxModule;
}
