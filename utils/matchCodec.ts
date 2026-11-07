import { GameState, Player, Team } from '../types';

export function base64UrlEncode(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    console.warn('[matchCodec] Encode failed:', e);
    return '';
  }
}

export function base64UrlDecode(str: string): string {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.warn('[matchCodec] Decode failed:', e);
    return '';
  }
}

export interface CompactMatchPayload {
  a: {
    n: string; // Away team name
    fn?: string; // Full name
    c: string; // Color
    bc?: string; // Base color
    s?: number; // Score
    p?: [string, string, string?]; // Pitcher: [name, number, stat]
    l?: [string, string, string, string?][]; // Lineup: [[name, number, position, stat], ...]
    bi?: number; // currentBatterIndex
  };
  h: {
    n: string; // Home team name
    fn?: string;
    c: string;
    bc?: string;
    s?: number;
    p?: [string, string, string?];
    l?: [string, string, string, string?][];
    bi?: number;
  };
  m?: {
    inn?: number;
    top?: boolean;
    o?: number;
    b?: number;
    s?: number;
    h_a?: number; // away hits
    h_h?: number; // home hits
    e_a?: number; // away errors
    e_h?: number; // home errors
  };
}

/**
 * Encodes the team names, colors, pitchers, and lineups into a compact URL-safe base64 string.
 * This guarantees exported OBS overlay links display custom rosters immediately upon first render.
 */
export function encodeMatchData(state: GameState): string {
  try {
    const compact: CompactMatchPayload = {
      a: {
        n: state.awayTeam.name || 'AWAY',
        fn: state.awayTeam.fullName,
        c: state.awayTeam.color || '#3b82f6',
        bc: state.awayTeam.baseColor,
        s: state.awayTeam.score || 0,
        p: [
          state.awayTeam.pitcher?.name || '',
          state.awayTeam.pitcher?.number || '',
          state.awayTeam.pitcher?.stat || '0',
        ],
        l: (state.awayTeam.lineup || []).map((p) => [
          p.name || '',
          p.number || '',
          p.position || 'DH',
          p.stat || '',
        ]),
        bi: state.awayTeam.currentBatterIndex || 0,
      },
      h: {
        n: state.homeTeam.name || 'HOME',
        fn: state.homeTeam.fullName,
        c: state.homeTeam.color || '#ef4444',
        bc: state.homeTeam.baseColor,
        s: state.homeTeam.score || 0,
        p: [
          state.homeTeam.pitcher?.name || '',
          state.homeTeam.pitcher?.number || '',
          state.homeTeam.pitcher?.stat || '0',
        ],
        l: (state.homeTeam.lineup || []).map((p) => [
          p.name || '',
          p.number || '',
          p.position || 'DH',
          p.stat || '',
        ]),
        bi: state.homeTeam.currentBatterIndex || 0,
      },
      m: {
        inn: state.inning || 1,
        top: state.isTop !== false,
        o: state.outs || 0,
        b: state.balls || 0,
        s: state.strikes || 0,
        h_a: state.awayTeam.hits || 0,
        h_h: state.homeTeam.hits || 0,
        e_a: state.awayTeam.errors || 0,
        e_h: state.homeTeam.errors || 0,
      },
    };

    return base64UrlEncode(JSON.stringify(compact));
  } catch (err) {
    console.warn('[matchCodec] encodeMatchData error:', err);
    return '';
  }
}

/**
 * Decodes the compact match payload from an exported URL and merges it onto baseState.
 */
export function decodeMatchData(encoded: string, baseState: GameState): GameState {
  if (!encoded) return baseState;
  try {
    const jsonStr = base64UrlDecode(encoded);
    if (!jsonStr) return baseState;
    const c = JSON.parse(jsonStr) as CompactMatchPayload;
    if (!c || (!c.a && !c.h)) return baseState;

    const buildTeam = (rawTeam: CompactMatchPayload['a'] | undefined, fallback: Team, isAway: boolean): Team => {
      if (!rawTeam) return fallback;
      const prefix = isAway ? 'away' : 'home';
      const parsedLineup: Player[] = (rawTeam.l && rawTeam.l.length > 0)
        ? rawTeam.l.map((item, idx) => ({
            id: `${prefix}_${idx + 1}`,
            name: item[0] || `PLAYER ${idx + 1}`,
            number: item[1] || `${idx + 1}`,
            position: (item[2] as any) || 'DH',
            stat: item[3] || '',
          }))
        : fallback.lineup;

      const parsedPitcher: Player = rawTeam.p
        ? {
            id: `${prefix}_p`,
            name: rawTeam.p[0] || '---',
            number: rawTeam.p[1] || '',
            position: 'P',
            stat: rawTeam.p[2] || '0',
          }
        : fallback.pitcher;

      return {
        ...fallback,
        name: rawTeam.n || fallback.name,
        fullName: rawTeam.fn || fallback.fullName,
        color: rawTeam.c || fallback.color,
        baseColor: rawTeam.bc || fallback.baseColor,
        score: typeof rawTeam.s === 'number' ? rawTeam.s : fallback.score,
        pitcher: parsedPitcher,
        lineup: parsedLineup,
        currentBatterIndex: typeof rawTeam.bi === 'number' ? rawTeam.bi : fallback.currentBatterIndex,
      };
    };

    const updatedAway = buildTeam(c.a, baseState.awayTeam, true);
    const updatedHome = buildTeam(c.h, baseState.homeTeam, false);

    return {
      ...baseState,
      inning: typeof c.m?.inn === 'number' ? c.m.inn : baseState.inning,
      isTop: typeof c.m?.top === 'boolean' ? c.m.top : baseState.isTop,
      outs: typeof c.m?.o === 'number' ? c.m.o : baseState.outs,
      balls: typeof c.m?.b === 'number' ? c.m.b : baseState.balls,
      strikes: typeof c.m?.s === 'number' ? c.m.s : baseState.strikes,
      awayTeam: {
        ...updatedAway,
        hits: typeof c.m?.h_a === 'number' ? c.m.h_a : updatedAway.hits,
        errors: typeof c.m?.e_a === 'number' ? c.m.e_a : updatedAway.errors,
      },
      homeTeam: {
        ...updatedHome,
        hits: typeof c.m?.h_h === 'number' ? c.m.h_h : updatedHome.hits,
        errors: typeof c.m?.e_h === 'number' ? c.m.e_h : updatedHome.errors,
      },
      animation: null,
    };
  } catch (err) {
    console.warn('[matchCodec] decodeMatchData error:', err);
    return baseState;
  }
}
