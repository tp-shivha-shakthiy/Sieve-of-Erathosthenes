import { useCallback, useEffect, useReducer } from "react";

export interface PlayerState {
  index: number;
  playing: boolean;
  speed: number;
}

export type PlayerAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "reset" }
  | { type: "advance" }
  | { type: "setSpeed"; ms: number };

export interface StepPlayer extends PlayerState {
  atStart: boolean;
  atEnd: boolean;
  progress: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  setSpeed: (ms: number) => void;
}

export function initialPlayerState(speed: number): PlayerState {
  return { index: 0, playing: false, speed };
}

function clamp(value: number, totalSteps: number): number {
  return Math.max(0, Math.min(Math.max(totalSteps - 1, 0), value));
}

/**
 * Pure state machine behind the transport controls. Exposed separately so the
 * start/pause/resume/reset/next/prev behaviour can be unit-tested without a DOM.
 */
export function stepPlayerReducer(state: PlayerState, action: PlayerAction, totalSteps: number): PlayerState {
  switch (action.type) {
    case "play":
      return { ...state, index: state.index >= totalSteps - 1 ? 0 : state.index, playing: true };
    case "pause":
      return { ...state, playing: false };
    case "toggle":
      return state.playing
        ? { ...state, playing: false }
        : { ...state, index: state.index >= totalSteps - 1 ? 0 : state.index, playing: true };
    case "next":
      return { ...state, playing: false, index: clamp(state.index + 1, totalSteps) };
    case "prev":
      return { ...state, playing: false, index: clamp(state.index - 1, totalSteps) };
    case "reset":
      return { ...state, playing: false, index: 0 };
    case "advance":
      if (!state.playing) return state;
      return state.index >= totalSteps - 1
        ? { ...state, playing: false }
        : { ...state, index: state.index + 1 };
    case "setSpeed":
      return { ...state, speed: action.ms };
    default:
      return state;
  }
}

/**
 * Drives a discrete step animation with start/pause/resume/reset/next/prev
 * and a configurable delay between automatic advances.
 */
export function useStepPlayer(totalSteps: number, initialSpeed = 800, resetKey?: unknown): StepPlayer {
  const [state, dispatch] = useReducer(
    (current: PlayerState, action: PlayerAction) => stepPlayerReducer(current, action, totalSteps),
    initialSpeed,
    initialPlayerState,
  );

  // Rebuild the timeline whenever the underlying simulation changes.
  useEffect(() => {
    dispatch({ type: "reset" });
  }, [resetKey, totalSteps]);

  useEffect(() => {
    if (!state.playing) return undefined;
    if (state.index >= totalSteps - 1) {
      dispatch({ type: "pause" });
      return undefined;
    }
    const timer = window.setTimeout(() => dispatch({ type: "advance" }), state.speed);
    return () => window.clearTimeout(timer);
  }, [state.playing, state.index, state.speed, totalSteps]);

  const play = useCallback(() => dispatch({ type: "play" }), []);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const toggle = useCallback(() => dispatch({ type: "toggle" }), []);
  const next = useCallback(() => dispatch({ type: "next" }), []);
  const prev = useCallback(() => dispatch({ type: "prev" }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const setSpeed = useCallback((ms: number) => dispatch({ type: "setSpeed", ms }), []);

  return {
    ...state,
    atStart: state.index <= 0,
    atEnd: state.index >= totalSteps - 1,
    progress: totalSteps > 1 ? (state.index / (totalSteps - 1)) * 100 : 100,
    play,
    pause,
    toggle,
    next,
    prev,
    reset,
    setSpeed,
  };
}
