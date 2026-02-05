/**
 * @fileoverview Memory-Safe Chunked Encoding Guard
 * @description RFC 7230 compliant chunked transfer encoding parser with DoD-grade memory safety
 * @module security/chunked-encoding-guard
 * @version 1.0.0
 *
 * @see {@link https://tools.ietf.org/html/rfc7230#section-4.1 RFC 7230 Section 4.1}
 */

export enum ChunkedEncodingError {
	OVERSIZED_CHUNK = "OVERSIZED_CHUNK",
	OVER_SIZE_LIMIT = "OVER_SIZE_LIMIT",
	INVALID_HEX = "INVALID_HEX",
	MALFORMED = "MALFORMED",
	EXTRA_DATA = "EXTRA_DATA",
}

export interface ChunkedEncodingResult {
	chunks: Uint8Array[];
	totalSize: number;
	extraData: Uint8Array | null;
}

export interface ChunkedValidationResult {
	isValid: boolean;
	error?: ChunkedEncodingError;
	message?: string;
}

export class ChunkedEncodingGuard {
	public readonly MAX_CHUNK_SIZE = 1024 * 1024; // 1MB
	public readonly MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB
	private readonly MAX_SIZE_LINE_LENGTH = 16;

	async validateChunkedBody(req: Request): Promise<ChunkedValidationResult> {
		try {
			const data = await req.arrayBuffer();
			const uint8Data = new Uint8Array(data);
			this.parse(uint8Data);
			return { isValid: true };
		} catch (error: any) {
			return {
				isValid: false,
				error: error.message?.includes("OVERSIZED") 
					? ChunkedEncodingError.OVERSIZED_CHUNK
					: ChunkedEncodingError.MALFORMED,
				message: error.message,
			};
		}
	}

	parse(data: Uint8Array): ChunkedEncodingResult {
		const chunks: Uint8Array[] = [];
		let offset = 0;
		let totalSize = 0;

		while (offset < data.length) {
			const crlfPos = this.findCRLF(data, offset);
			if (crlfPos === -1) {
				throw new Error(
					`${ChunkedEncodingError.MALFORMED}: Missing CRLF after chunk size at offset ${offset}`,
				);
			}

			const sizeLine = this.extractSizeLine(data, offset, crlfPos);
			if (sizeLine.length > this.MAX_SIZE_LINE_LENGTH) {
				throw new Error(
					`${ChunkedEncodingError.MALFORMED}: Chunk size line too long`,
				);
			}

			const chunkSize = parseInt(sizeLine, 16);
			if (isNaN(chunkSize) || chunkSize < 0) {
				throw new Error(
					`${ChunkedEncodingError.INVALID_HEX}: Invalid chunk size "${sizeLine}"`,
				);
			}

			if (chunkSize > this.MAX_CHUNK_SIZE) {
				throw new Error(
					`${ChunkedEncodingError.OVERSIZED_CHUNK}: Chunk size ${chunkSize} exceeds maximum ${this.MAX_CHUNK_SIZE}`,
				);
			}

			if (chunkSize === 0) {
				offset = crlfPos + 2;
				const finalCrlfPos = this.findCRLF(data, offset);
				if (finalCrlfPos === -1) {
					throw new Error(
						`${ChunkedEncodingError.MALFORMED}: Missing final CRLF after zero chunk`,
					);
				}
				offset = finalCrlfPos + 2;
				if (offset < data.length) {
					const extraData = data.slice(offset);
					return { chunks, totalSize, extraData };
				}
				return { chunks, totalSize, extraData: null };
			}

			totalSize += chunkSize;
			if (totalSize > this.MAX_TOTAL_SIZE) {
				throw new Error(
					`${ChunkedEncodingError.OVER_SIZE_LIMIT}: Total size ${totalSize} exceeds maximum ${this.MAX_TOTAL_SIZE}`,
				);
			}

			const chunkStart = crlfPos + 2;
			const chunkEnd = chunkStart + chunkSize;
			if (chunkEnd > data.length) {
				throw new Error(
					`${ChunkedEncodingError.MALFORMED}: Chunk extends beyond data`,
				);
			}

			const chunk = data.slice(chunkStart, chunkEnd);
			chunks.push(chunk);

			const chunkCrlfPos = this.findCRLF(data, chunkEnd);
			if (chunkCrlfPos === -1) {
				throw new Error(
					`${ChunkedEncodingError.MALFORMED}: Missing CRLF after chunk data`,
				);
			}
			offset = chunkCrlfPos + 2;
		}

		throw new Error(
			`${ChunkedEncodingError.MALFORMED}: Reached end without final zero chunk`,
		);
	}

	private findCRLF(data: Uint8Array, startOffset: number): number {
		for (let i = startOffset; i < data.length - 1; i++) {
			if (data[i] === 13 && data[i + 1] === 10) {
				return i;
			}
		}
		return -1;
	}

	private extractSizeLine(data: Uint8Array, start: number, end: number): string {
		let sizeEnd = end;
		for (let i = start; i < end; i++) {
			if (data[i] === 59) {
				sizeEnd = i;
				break;
			}
		}
		const sizeBytes = data.slice(start, sizeEnd);
		return new TextDecoder("ascii", { fatal: false }).decode(sizeBytes).trim();
	}
}

export const chunkedGuard = new ChunkedEncodingGuard();

