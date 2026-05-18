/**
 * Enhanced stream utilities using Bun's native capabilities
 * Provides streaming conversions and transformations with throttling and progress support
 */

/**
 * Options for uint8ArrayToStream
 */
export interface StreamOptions {
  /** Chunk size in bytes (default: 64KB) */
  chunkSize?: number;
  /** Delay between chunks in ms for throttling (default: 0) */
  delay?: number;
}

/**
 * Output format for readableTo
 */
export type OutputFormat = 'arrayBuffer' | 'text' | 'json' | 'blob';

/**
 * Result type for readableTo based on format
 */
export type ReadableResult<T extends OutputFormat> = T extends 'arrayBuffer'
  ? ArrayBuffer
  : T extends 'text'
    ? string
    : T extends 'json'
      ? unknown
      : T extends 'blob'
        ? Blob
        : never;

/**
 * Stream utilities class with static methods
 */
export class StreamUtils {
  /**
   * Convert a Uint8Array to a ReadableStream with optional chunking and throttling
   * @param arr - The Uint8Array to convert
   * @param options - Stream options including chunkSize and delay
   * @returns A ReadableStream of the array data
   */
  static uint8ArrayToStream(
    arr: Uint8Array,
    options: StreamOptions = {}
  ): ReadableStream<Uint8Array> {
    const { chunkSize = 64 * 1024, delay = 0 } = options; // 64KB default

    // Handle empty array
    if (arr.length === 0) {
      return new ReadableStream({
        start(ctrl) {
          ctrl.close();
        }
      });
    }

    // Fast path: default chunk size and no delay, use Blob.stream()
    if (delay === 0 && chunkSize === 64 * 1024) {
      return new Blob([arr as BlobPart]).stream();
    }

    // Manual chunking for custom chunk sizes or throttling
    return new ReadableStream({
      async start(controller) {
        let offset = 0;

        while (offset < arr.length) {
          const size = Math.min(chunkSize, arr.length - offset);
          const chunk = arr.subarray(offset, offset + size);
          controller.enqueue(chunk);
          offset += size;

          if (offset < arr.length && delay > 0) await Bun.sleep(delay);
        }

        controller.close();
      }
    });
  }

  /**
   * Convert a Node.js Readable stream to various formats
   * Uses Response as an adapter for clean conversion
   * @param stream - NodeJS.ReadableStream to convert
   * @param format - Desired output format
   * @returns Promise resolving to the requested format
   */
  static async readableTo<T extends OutputFormat>(
    stream: NodeJS.ReadableStream,
    format: T
  ): Promise<ReadableResult<T>> {
    const response = new Response(stream as unknown as ReadableStream);

    switch (format) {
      case 'arrayBuffer':
        return (await response.arrayBuffer()) as ReadableResult<T>;
      case 'text':
        return (await response.text()) as ReadableResult<T>;
      case 'json':
        return (await response.json()) as ReadableResult<T>;
      case 'blob':
        return (await response.blob()) as ReadableResult<T>;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  /**
   * Convert Node.js Readable to ArrayBuffer
   */
  static async readableToArrayBuffer(
    stream: NodeJS.ReadableStream
  ): Promise<ArrayBuffer> {
    return this.readableTo(stream, 'arrayBuffer');
  }

  /**
   * Convert Node.js Readable to text string
   */
  static async readableToText(stream: NodeJS.ReadableStream): Promise<string> {
    return this.readableTo(stream, 'text');
  }

  /**
   * Convert Node.js Readable to parsed JSON
   */
  static async readableToJson<T = unknown>(
    stream: NodeJS.ReadableStream
  ): Promise<T> {
    return (await this.readableTo(stream, 'json')) as T;
  }

  /**
   * Convert Node.js Readable to Blob
   */
  static async readableToBlob(stream: NodeJS.ReadableStream): Promise<Blob> {
    return this.readableTo(stream, 'blob');
  }

  /**
   * Create a streaming response with proper error handling
   * @param data - Data to stream
   * @param options - Stream options
   * @returns Response object with streaming body
   */
  static createStreamingResponse(
    data: Uint8Array | string,
    options: StreamOptions = {}
  ): Response {
    const arr = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const stream = this.uint8ArrayToStream(arr, options);

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Transfer-Encoding': 'chunked'
      }
    });
  }

  /**
   * Pipe a ReadableStream to a writable target (like a file)
   * @param stream - Source ReadableStream
   * @param target - Target file path
   */
  static async streamToFile(
    stream: ReadableStream<Uint8Array>,
    target: string
  ): Promise<void> {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    await Bun.write(target, result);
  }

  /**
   * Merge multiple Uint8Arrays into a single stream
   * @param arrays - Arrays to merge
   * @param options - Stream options
   */
  static mergeArrays(
    arrays: Uint8Array[],
    options: StreamOptions = {}
  ): ReadableStream<Uint8Array> {
    return new ReadableStream({
      async start(controller) {
        for (const arr of arrays) {
          const stream = StreamUtils.uint8ArrayToStream(arr, options);
          const reader = stream.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
            if (options.delay) await Bun.sleep(options.delay);
          }
        }
        controller.close();
      }
    });
  }

  /**
   * Create a transform stream that processes chunks
   * @param transform - Transform function for each chunk
   */
  static createTransformStream(
    transform: (chunk: Uint8Array) => Uint8Array | Promise<Uint8Array>
  ): TransformStream<Uint8Array, Uint8Array> {
    return new TransformStream({
      async transform(chunk, controller) {
        const result = await transform(chunk);
        controller.enqueue(result);
      }
    });
  }

  /**
   * Tee a readable stream into two identical streams
   * Useful for processing the same data multiple ways
   * @param stream - Source stream
   * @returns Array of two ReadableStreams
   */
  static tee<T = Uint8Array>(
    stream: ReadableStream<T>
  ): [ReadableStream<T>, ReadableStream<T>] {
    return stream.tee();
  }

  /**
   * Buffer a stream into a single Uint8Array
   * Useful for collecting all chunks before processing
   * @param stream - Source stream
   * @returns Promise resolving to buffered data
   */
  static async buffer(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Pipe a stream through a transform, optionally to a destination
   * @param source - Source stream
   * @param transform - Transform stream to pipe through
   * @param destination - Optional writable destination
   * @returns Piped stream (if no destination) or void (if piped to destination)
   */
  static pipe<T = Uint8Array, R = Uint8Array>(
    source: ReadableStream<T>,
    transform: TransformStream<T, R>
  ): ReadableStream<R>;

  static pipe<T = Uint8Array, R = Uint8Array>(
    source: ReadableStream<T>,
    transform: TransformStream<T, R>,
    destination: WritableStream<R>
  ): Promise<void>;

  static pipe<T = Uint8Array, R = Uint8Array>(
    source: ReadableStream<T>,
    transform: TransformStream<T, R>,
    destination?: WritableStream<R>
  ): ReadableStream<R> | Promise<void> {
    const piped = source.pipeThrough(transform);

    if (destination) {
      return piped.pipeTo(destination);
    }

    return piped;
  }

  /**
   * Create a readable stream from an async generator
   * @param generator - Async generator yielding Uint8Array chunks
   * @returns ReadableStream
   */
  static fromAsyncGenerator(
    generator: AsyncGenerator<Uint8Array, void, unknown>
  ): ReadableStream<Uint8Array> {
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }

  /**
   * Create a readable stream from an iterable
   * @param iterable - Iterable or async iterable of chunks
   * @returns ReadableStream
   */
  static fromIterable<T = Uint8Array>(
    iterable: Iterable<T> | AsyncIterable<T>
  ): ReadableStream<T> {
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of iterable) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }

  /**
   * Split a stream into lines (text mode)
   * @param stream - Source stream (assumes UTF-8 text)
   * @returns ReadableStream of text lines
   */
  static splitLines(stream: ReadableStream<Uint8Array>): ReadableStream<string> {
    const decoder = new TextDecoder();
    let buffer = '';

    return new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Emit any remaining buffer
              if (buffer.length > 0) {
                controller.enqueue(buffer);
              }
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);

            // Keep the last line (might be incomplete)
            buffer = lines.pop() || '';

            for (const line of lines) {
              controller.enqueue(line);
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }

  /**
   * Limit the rate of a stream
   * @param stream - Source stream
   * @param bytesPerSecond - Maximum bytes per second
   * @returns Throttled ReadableStream
   */
  static throttle(
    stream: ReadableStream<Uint8Array>,
    bytesPerSecond: number
  ): ReadableStream<Uint8Array> {
    const chunkInterval = 100; // ms
    const bytesPerChunk = Math.floor((bytesPerSecond * chunkInterval) / 1000);
    let buffer: Uint8Array | null = null;
    let byteOffset = 0;

    return new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        let timer: ReturnType<typeof setInterval> | null = null;

        const sendChunk = () => {
          if (buffer && byteOffset < buffer.length) {
            const chunkSize = Math.min(bytesPerChunk, buffer.length - byteOffset);
            const chunk = buffer.subarray(byteOffset, byteOffset + chunkSize);
            controller.enqueue(chunk);
            byteOffset += chunkSize;

            if (byteOffset >= buffer.length) {
              buffer = null;
              byteOffset = 0;
            }
          } else if (buffer === null && !timer) {
            // No more data, close if source is done
            controller.close();
          }
        };

        timer = setInterval(sendChunk, chunkInterval);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Wait for buffer to be consumed
              while (buffer && byteOffset < buffer.length) {
                await Bun.sleep(chunkInterval);
              }
              if (timer) clearInterval(timer);
              controller.close();
              break;
            }

            // Wait until buffer is consumed
            while (buffer !== null) {
              await Bun.sleep(chunkInterval);
            }

            buffer = value;
            byteOffset = 0;
          }
        } catch (error) {
          if (timer) clearInterval(timer);
          controller.error(error);
        }
      }
    });
  }

  /**
   * Count bytes/segments in a stream non-destructively
   * @param stream - Source stream
   * @returns Promise resolving to stats
   */
  static async stats(
    stream: ReadableStream<Uint8Array>
  ): Promise<{ byteCount: number; chunkCount: number }> {
    const [stream1] = this.tee(stream);

    let byteCount = 0;
    let chunkCount = 0;

    const reader = stream1.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.length;
      chunkCount++;
    }

    return { byteCount, chunkCount };
  }
}

// Export utility functions for convenient access
export const Stream = {
  /**
   * Convert Uint8Array to ReadableStream
   */
  toStream: (arr: Uint8Array, options?: StreamOptions) =>
    StreamUtils.uint8ArrayToStream(arr, options),

  /**
   * Convert Node.js Readable to ArrayBuffer
   */
  toArrayBuffer: (stream: NodeJS.ReadableStream) =>
    StreamUtils.readableToArrayBuffer(stream),

  /**
   * Convert Node.js Readable to text
   */
  toText: (stream: NodeJS.ReadableStream) =>
    StreamUtils.readableToText(stream),

  /**
   * Convert Node.js Readible to JSON
   */
  toJson: <T = unknown>(stream: NodeJS.ReadableStream) =>
    StreamUtils.readableToJson<T>(stream),

  /**
   * Convert Node.js Readable to Blob
   */
  toBlob: (stream: NodeJS.ReadableStream) =>
    StreamUtils.readableToBlob(stream),

  /**
   * Create streaming Response
   */
  response: (data: Uint8Array | string, options?: StreamOptions) =>
    StreamUtils.createStreamingResponse(data, options),

  /**
   * Stream to file
   */
  toFile: (stream: ReadableStream<Uint8Array>, target: string) =>
    StreamUtils.streamToFile(stream, target),

  /**
   * Merge multiple arrays into stream
   */
  merge: (arrays: Uint8Array[], options?: StreamOptions) =>
    StreamUtils.mergeArrays(arrays, options),

  /**
   * Create transform stream
   */
  transform: (fn: (chunk: Uint8Array) => Uint8Array | Promise<Uint8Array>) =>
    StreamUtils.createTransformStream(fn),

  /**
   * Tee a stream into two identical streams
   */
  tee: <T = Uint8Array>(stream: ReadableStream<T>) =>
    StreamUtils.tee<T>(stream),

  /**
   * Buffer a stream into Uint8Array
   */
  buffer: (stream: ReadableStream<Uint8Array>) =>
    StreamUtils.buffer(stream),

  /**
   * Pipe through transform (and optionally to destination)
   */
  pipe: <T = Uint8Array, R = Uint8Array>(
    source: ReadableStream<T>,
    transform: TransformStream<T, R>,
    destination?: WritableStream<R>
  ) => StreamUtils.pipe<T, R>(source, transform, destination as WritableStream<R>),

  /**
   * Create stream from async generator
   */
  fromGenerator: (generator: AsyncGenerator<Uint8Array>) =>
    StreamUtils.fromAsyncGenerator(generator),

  /**
   * Create stream from iterable
   */
  fromIterable: <T = Uint8Array>(iterable: Iterable<T> | AsyncIterable<T>) =>
    StreamUtils.fromIterable<T>(iterable),

  /**
   * Split stream into text lines
   */
  splitLines: (stream: ReadableStream<Uint8Array>) =>
    StreamUtils.splitLines(stream),

  /**
   * Throttle stream rate
   */
  throttle: (stream: ReadableStream<Uint8Array>, bytesPerSecond: number) =>
    StreamUtils.throttle(stream, bytesPerSecond),

  /**
   * Get stream stats (byte/chunk count)
   */
  stats: (stream: ReadableStream<Uint8Array>) =>
    StreamUtils.stats(stream)
};
