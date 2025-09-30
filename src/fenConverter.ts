/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

type Piece = {
	moveCount: number;
	notation: string;
	side: {
		name: 'black' | 'white';
	};
	type: string;
};

type Square = {
	file: string;
	rank: number;
	piece?: Piece;
};

type Board = {
	squares: Square[];
};

/**
 * Convert chess board state to FEN (Forsyth-Edwards Notation).
 */
export class FenConverter {
	/**
	 * Convert a board state to FEN notation.
	 * @param board The board state
	 * @param currentSide The current side to move ('white' or 'black')
	 * @returns FEN string
	 */
	public static toFen(board: Board, currentSide: string): string {
		// Build the piece placement part of FEN (ranks 8 to 1)
		const ranks: string[] = [];
		
		for (let rank = 8; rank >= 1; rank--) {
			let rankStr = '';
			let emptyCount = 0;
			
			for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
				const square = board.squares.find(
					s => s.file === file && s.rank === rank
				);
				
				if (square?.piece) {
					// Add empty squares if any
					if (emptyCount > 0) {
						rankStr += emptyCount;
						emptyCount = 0;
					}
					
					// Add piece notation
					const notation = this.getPieceNotation(square.piece);
					rankStr += notation;
				} else {
					emptyCount++;
				}
			}
			
			// Add trailing empty squares if any
			if (emptyCount > 0) {
				rankStr += emptyCount;
			}
			
			ranks.push(rankStr);
		}
		
		const piecePlacement = ranks.join('/');
		
		// Active color
		const activeColor = currentSide === 'white' ? 'w' : 'b';
		
		// Castling availability - simplified, we'd need to track this properly
		// For now, we'll assume castling is available if king and rooks haven't moved
		const castling = this.getCastlingRights(board);
		
		// En passant target square - would need to track the last move
		// For simplicity, using '-' (no en passant available)
		const enPassant = '-';
		
		// Halfmove clock - number of halfmoves since last capture or pawn advance
		// For simplicity, using 0
		const halfmove = '0';
		
		// Fullmove number - starts at 1, incremented after Black's move
		// For simplicity, using 1
		const fullmove = '1';
		
		return `${piecePlacement} ${activeColor} ${castling} ${enPassant} ${halfmove} ${fullmove}`;
	}

	private static getPieceNotation(piece: Piece): string {
		// Convert piece type to FEN notation
		const notationMap: { [key: string]: string } = {
			'pawn': 'P',
			'knight': 'N',
			'bishop': 'B',
			'rook': 'R',
			'queen': 'Q',
			'king': 'K'
		};
		
		let notation = notationMap[piece.type] || piece.notation.toUpperCase();
		
		// Lowercase for black pieces
		if (piece.side.name === 'black') {
			notation = notation.toLowerCase();
		}
		
		return notation;
	}

	private static getCastlingRights(board: Board): string {
		let rights = '';
		
		// Check white king and rooks
		const whiteKing = board.squares.find(
			s => s.piece?.type === 'king' &&
				s.piece?.side.name === 'white' &&
				s.file === 'e' && s.rank === 1
		);
		
		if (whiteKing?.piece?.moveCount === 0) {
			// Check kingside rook
			const whiteKingsideRook = board.squares.find(
				s => s.piece?.type === 'rook' &&
					s.piece?.side.name === 'white' &&
					s.file === 'h' && s.rank === 1
			);
			if (whiteKingsideRook?.piece?.moveCount === 0) {
				rights += 'K';
			}
			
			// Check queenside rook
			const whiteQueensideRook = board.squares.find(
				s => s.piece?.type === 'rook' &&
					s.piece?.side.name === 'white' &&
					s.file === 'a' && s.rank === 1
			);
			if (whiteQueensideRook?.piece?.moveCount === 0) {
				rights += 'Q';
			}
		}
		
		// Check black king and rooks
		const blackKing = board.squares.find(
			s => s.piece?.type === 'king' &&
				s.piece?.side.name === 'black' &&
				s.file === 'e' && s.rank === 8
		);
		
		if (blackKing?.piece?.moveCount === 0) {
			// Check kingside rook
			const blackKingsideRook = board.squares.find(
				s => s.piece?.type === 'rook' &&
					s.piece?.side.name === 'black' &&
					s.file === 'h' && s.rank === 8
			);
			if (blackKingsideRook?.piece?.moveCount === 0) {
				rights += 'k';
			}
			
			// Check queenside rook
			const blackQueensideRook = board.squares.find(
				s => s.piece?.type === 'rook' &&
					s.piece?.side.name === 'black' &&
					s.file === 'a' && s.rank === 8
			);
			if (blackQueensideRook?.piece?.moveCount === 0) {
				rights += 'q';
			}
		}
		
		return rights || '-';
	}
}
