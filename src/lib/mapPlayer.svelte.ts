// ── Weather map playback ────────────────────────────────────────

import {
  fetchFrames,
  nearestFrame,
  pickDomain,
  type Bounds,
  type FrameSet,
  type MapLayerKind,
} from "$lib/mapLayers";

export type Slot = "a" | "b";

const FRAME_MS = 800;
const LOAD_TIMEOUT_MS = 6000;
const FIRST_FRAME_TIMEOUT_MS = 12000;

export class FramePlayer {
  frameSet = $state<FrameSet | null>(null);
  failed = $state(false);
  idx = $state(0);
  playing = $state(false);
  ready = $state(false);
  slots = $state<Record<Slot, number>>({ a: 0, b: 0 });
  visible = $state<Slot>("a");

  loadedProbe?: (slot: Slot) => boolean;

  #kind: MapLayerKind;
  #domain: string | null = null;
  #inflight: Slot | null = null;
  #target = 0;
  #advancing = false;
  #resumeAfterScrub = false;
  #loadSeq = 0;
  #timer: ReturnType<typeof setInterval> | undefined;
  #watchdog: ReturnType<typeof setTimeout> | undefined;
  #autoplay = false;
  #readyTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(kind: MapLayerKind) {
    this.#kind = kind;
  }

  get frames() {
    return this.frameSet?.frames ?? [];
  }

  get hidden(): Slot {
    return this.visible === "a" ? "b" : "a";
  }

  get shownIdx() {
    return this.slots[this.visible];
  }

  get loading() {
    return this.ready && this.#inflight !== null;
  }

  get isNow() {
    return this.frameSet !== null && this.idx === this.frameSet.nowIndex;
  }

  // ── Loading ───────────────────────────────────────────────────

  async ensureDomain(view: Bounds): Promise<void> {
    const next = pickDomain(view, this.frameSet?.domain);
    if (this.frameSet && this.frameSet.domain === next) return;
    await this.#loadDomain(next);
  }

  retry(): Promise<void> {
    return this.#loadDomain(this.#domain ?? "dwd_icon");
  }

  async #loadDomain(domain: string): Promise<void> {
    const seq = ++this.#loadSeq;
    this.#domain = domain;
    this.failed = false;
    const heldTime = this.frameSet?.frames[this.idx]?.time.getTime();

    try {
      const fs = await fetchFrames(this.#kind, domain);
      if (seq !== this.#loadSeq) return;
      this.#adopt(
        fs,
        heldTime === undefined
          ? fs.nowIndex
          : nearestFrame(fs.frames, heldTime),
      );
    } catch {
      if (seq !== this.#loadSeq) return;
      if (!this.frameSet) this.failed = true;
    }
  }

  #adopt(fs: FrameSet, start: number) {
    const resume = this.frameSet ? this.playing : !prefersReducedMotion();

    this.pause();
    this.frameSet = fs;
    this.idx = start;
    this.slots = { a: start, b: this.#next(start, fs) };
    this.visible = "a";
    this.#inflight = null;
    this.#target = start;
    this.#advancing = false;
    this.#resumeAfterScrub = false;
    this.#clearWatchdog();

    this.ready = false;
    this.#autoplay = resume;
    clearTimeout(this.#readyTimer);
    this.#readyTimer = setTimeout(() => this.#markReady(), FIRST_FRAME_TIMEOUT_MS);
  }

  #markReady() {
    if (this.ready) return;
    clearTimeout(this.#readyTimer);
    this.#readyTimer = undefined;
    this.ready = true;
    if (this.#autoplay) {
      this.#autoplay = false;
      this.play();
    }
  }

  // ── Transport ─────────────────────────────────────────────────

  play() {
    if (!this.frameSet) return;
    this.#resumeAfterScrub = false;
    this.playing = true;
    this.#stopTimer();
    this.#timer = setInterval(() => this.#tick(), FRAME_MS);
  }

  pause() {
    this.playing = false;
    this.#stopTimer();
  }

  togglePlay() {
    this.#resumeAfterScrub = false;
    this.playing ? this.pause() : this.play();
  }

  seek(to: number) {
    const total = this.frames.length;
    if (!total) return;
    const next = Math.min(Math.max(Math.round(to), 0), total - 1);
    if (next === this.idx) return;
    if (this.playing) {
      this.pause();
      this.#resumeAfterScrub = true;
    }
    this.idx = next;
    this.#target = next;
    this.#advancing = false;
    this.#request();
  }

  settle() {
    if (this.#resumeAfterScrub) {
      this.#resumeAfterScrub = false;
      this.play();
    }
    this.#request();
  }

  #tick() {
    if (!this.frameSet || this.#inflight || !this.ready) return;
    this.#target = this.#next(this.idx);
    this.#advancing = true;
    this.#request();
  }

  // ── Double buffering ──────────────────────────────────────────

  #request() {
    if (!this.frameSet || this.#inflight) return;
    const target = this.#target;

    if (this.slots[this.visible] === target) {
      this.#warm();
      return;
    }

    const other = this.hidden;
    if (this.slots[other] !== target) {
      this.slots = { ...this.slots, [other]: target };
    }
    this.#inflight = other;

    if (this.loadedProbe?.(other)) {
      this.#resolve(other);
      return;
    }
    this.#armWatchdog();
  }

  reportSlotLoaded(slot: Slot) {
    if (slot === this.visible && this.slots[slot] === this.#target) {
      this.#markReady();
    }
    if (this.#inflight === slot) this.#resolve(slot);
  }

  #resolve(slot: Slot) {
    this.#inflight = null;
    this.#clearWatchdog();
    this.visible = slot;
    if (this.#advancing) this.idx = this.slots[slot];
    this.#markReady();
    this.#request();
  }

  #warm() {
    if (!this.playing || this.frames.length < 2) return;
    const next = this.#next(this.shownIdx);
    if (this.slots[this.hidden] !== next) {
      this.slots = { ...this.slots, [this.hidden]: next };
    }
  }

  #next(from: number, fs: FrameSet | null = this.frameSet) {
    const total = fs?.frames.length ?? 0;
    if (!total) return 0;
    return (from + 1) % total;
  }

  #armWatchdog() {
    this.#clearWatchdog();
    this.#watchdog = setTimeout(() => {
      this.#watchdog = undefined;
      const slot = this.#inflight;
      this.#inflight = null;
      if (slot && this.slots[slot] === this.#target) {
        this.#resolve(slot);
        return;
      }
      this.#markReady();
      this.#request();
    }, LOAD_TIMEOUT_MS);
  }

  #clearWatchdog() {
    clearTimeout(this.#watchdog);
    this.#watchdog = undefined;
  }

  #stopTimer() {
    clearInterval(this.#timer);
    this.#timer = undefined;
  }

  destroy() {
    this.#loadSeq++;
    this.#autoplay = false;
    this.#stopTimer();
    this.#clearWatchdog();
    clearTimeout(this.#readyTimer);
    this.#readyTimer = undefined;
  }
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
