/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventEmitter } from 'events';
import * as path from 'path';

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
/* eslint-enable @typescript-eslint/no-var-requires */

export interface AnalysisResult {
	score: number; // Centipawn score (positive = white advantage)
	mate?: number; // Mate in N moves (positive = white mates, negative = black mates)
	bestMove?: string; // Best move in UCI format (e.g., "e2e4")
	depth: number; // Search depth
}

/**
 * Stockfish chess engine analyzer.
 */
export class StockfishAnalyzer extends EventEmitter {
	private engine: any;
	private isReady = false;
	private currentPosition = '';

	constructor() {
		super();
		this.initEngine();
	}

	private initEngine() {
		try {
			// Try to load stockfish using the lite single-threaded version for Node.js compatibility
			const stockfishDir = path.join(__dirname, '..', 'node_modules', 'stockfish', 'src');
			const engineFile = 'stockfish-17.1-lite-single-03e3232.js';
			const enginePath = path.join(stockfishDir, engineFile);
			
			if (fs.existsSync(enginePath)) {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const INIT_ENGINE = require(enginePath);
				this.engine = INIT_ENGINE();
				
				this.engine.onmessage = (line: string) => {
					// console.log('Stockfish:', line);
					
					if (line === 'uciok') {
						this.engine.postMessage('isready');
					} else if (line === 'readyok') {
						this.isReady = true;
						this.emit('ready');
					} else if (line.startsWith('info depth')) {
						this.parseAnalysis(line);
					} else if (line.startsWith('bestmove')) {
						this.parseBestMove(line);
					}
				};

				// Initialize UCI protocol
				this.engine.postMessage('uci');
			} else {
				// eslint-disable-next-line no-console
				console.error('Stockfish engine not found, analysis will be disabled');
				this.isReady = false;
			}
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error('Error initializing Stockfish:', err);
			this.isReady = false;
		}
	}

	private parseAnalysis(line: string) {
		// Parse Stockfish info line
		// Example: info depth 12 seldepth 18 multipv 1 score cp 25 nodes 123456 nps 100000 time 1234 pv e2e4 e7e5
		const parts = line.split(' ');
		let depth = 0;
		let score: number | undefined;
		let mate: number | undefined;
		let pv: string[] = [];

		for (let i = 0; i < parts.length; i++) {
			if (parts[i] === 'depth') {
				depth = parseInt(parts[i + 1], 10);
			} else if (parts[i] === 'score') {
				if (parts[i + 1] === 'cp') {
					score = parseInt(parts[i + 2], 10);
				} else if (parts[i + 1] === 'mate') {
					mate = parseInt(parts[i + 2], 10);
				}
			} else if (parts[i] === 'pv') {
				pv = parts.slice(i + 1);
				break;
			}
		}

		if ((score !== undefined || mate !== undefined) && depth >= 10) {
			const result: AnalysisResult = {
				score: score !== undefined ? score : (mate > 0 ? 10000 : -10000),
				mate,
				bestMove: pv[0],
				depth
			};
			this.emit('analysis', result);
		}
	}

	private parseBestMove(line: string) {
		// Example: bestmove e2e4 ponder e7e5
		const parts = line.split(' ');
		if (parts.length >= 2) {
			this.emit('bestmove', parts[1]);
		}
	}

	/**
	 * Analyze a position given in FEN notation.
	 */
	public analyzePosition(fen: string, depth = 15) {
		if (!this.isReady || !this.engine) {
			// If engine is not ready, silently skip analysis
			return;
		}

		this.currentPosition = fen;
		this.engine.postMessage(`position fen ${fen}`);
		this.engine.postMessage(`go depth ${depth}`);
	}

	/**
	 * Stop the current analysis.
	 */
	public stopAnalysis() {
		if (this.isReady && this.engine) {
			this.engine.postMessage('stop');
		}
	}

	/**
	 * Terminate the engine.
	 */
	public quit() {
		if (this.engine) {
			this.engine.postMessage('quit');
			if (this.engine.terminate) {
				this.engine.terminate();
			}
		}
	}
}
