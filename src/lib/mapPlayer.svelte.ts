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
const SCRUB_COMMIT_MS = 200;

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
  #dir: 1 | -1 = 1;
  #pending: Slot | null = null;
  #loadSeq = 0;
  #timer: ReturnType<typeof setInterval> | undefined;
  #watchdog: ReturnType<typeof setTimeout> | undefined;
  #throttle: ReturnType<typeof setTimeout> | undefined;
  #throttled = false;
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
    this.slots = { a: start, b: this.#step(start, 1, fs) };
    this.visible = "a";
    this.#pending = null;
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
    this.playing = true;
    this.#stopTimer();
    this.#timer = setInterval(() => this.#tick(), FRAME_MS);
  }

  pause() {
    this.playing = false;
    this.#stopTimer();
  }

  togglePlay() {
    this.playing ? this.pause() : this.play();
  }

  seek(to: number) {
    const total = this.frames.length;
    if (!total) return;
    const next = Math.min(Math.max(Math.round(to), 0), total - 1);
    if (next === this.idx) return;
    this.#dir = next > this.idx ? 1 : -1;
    this.idx = next;
    this.pause();
    this.#throttleCommit();
  }

  settle() {
    clearTimeout(this.#throttle);
    this.#throttle = undefined;
    this.#throttled = false;
    this.#commit();
  }

  #tick() {
    if (!this.frameSet || this.#pending || !this.ready) return;
    this.#dir = 1;
    this.idx = this.#step(this.idx, 1);
    this.#commit();
  }

  // ── Double buffering ──────────────────────────────────────────

  #throttleCommit() {
    if (this.#throttle !== undefined) {
      this.#throttled = true;
      return;
    }
    this.#commit();
    this.#throttle = setTimeout(() => {
      this.#throttle = undefined;
      if (this.#throttled) {
        this.#throttled = false;
        this.#throttleCommit();
      }
    }, SCRUB_COMMIT_MS);
  }

  #commit() {
    if (!this.frameSet) return;
    const target = this.idx;

    if (this.slots[this.visible] === target) {
      this.#pending = null;
      this.#clearWatchdog();
      this.#warm();
      return;
    }

    const other = this.hidden;
    if (this.slots[other] !== target) {
      this.slots = { ...this.slots, [other]: target };
    }
    this.#pending = other;

    if (this.loadedProbe?.(other)) {
      this.#flip();
      return;
    }
    this.#armWatchdog();
  }

  reportSlotLoaded(slot: Slot) {
    if (slot === this.visible && this.slots[slot] === this.idx) {
      this.#markReady();
    }
    if (this.#pending === slot && this.slots[slot] === this.idx) this.#flip();
  }

  #flip() {
    if (!this.#pending) return;
    this.visible = this.#pending;
    this.#pending = null;
    this.#clearWatchdog();
    this.#markReady();
    this.#warm();
  }

  #warm() {
    if (!this.playing || this.frames.length < 2) return;
    const next = this.#step(this.shownIdx, this.#dir);
    if (this.slots[this.hidden] !== next) {
      this.slots = { ...this.slots, [this.hidden]: next };
    }
  }

  #step(from: number, dir: 1 | -1, fs: FrameSet | null = this.frameSet) {
    const total = fs?.frames.length ?? 0;
    if (!total) return 0;
    return (from + dir + total) % total;
  }

  #armWatchdog() {
    this.#clearWatchdog();
    this.#watchdog = setTimeout(() => {
      this.#watchdog = undefined;
      this.#flip();
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
    clearTimeout(this.#throttle);
    this.#throttle = undefined;
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
