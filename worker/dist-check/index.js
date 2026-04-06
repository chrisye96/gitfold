var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../node_modules/.pnpm/@cloudflare+unenv-preset@2._2c4214a3e65f1ca7ba28eec8e1e8cbc6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../node_modules/.pnpm/@cloudflare+unenv-preset@2._2c4214a3e65f1ca7ba28eec8e1e8cbc6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260317.1/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd2) {
    super();
    this.fd = fd2;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd2) {
    super();
    this.fd = fd2;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// ../node_modules/.pnpm/unenv@2.0.0-rc.14/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// ../node_modules/.pnpm/@cloudflare+unenv-preset@2._2c4214a3e65f1ca7ba28eec8e1e8cbc6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260317.1/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context2, () => dispatch(i + 1));
        } catch (err2) {
          if (err2 instanceof Error && onError) {
            context2.error = err2;
            res = await onError(err2, context2);
            isError = true;
          } else {
            throw err2;
          }
        }
      } else {
        if (context2.finalized === false && onNotFound) {
          res = await onNotFound(context2);
        }
      }
      if (res && (context2.finalized === false || isError)) {
        context2.res = res;
      }
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = /* @__PURE__ */ __name(class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
}, "HonoRequest");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context: context2 }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = /* @__PURE__ */ __name(class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
}, "Context");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = /* @__PURE__ */ __name(class extends Error {
}, "UnsupportedPathError");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err2, c) => {
  if ("getResponse" in err2) {
    const res = err2.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err2);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = /* @__PURE__ */ __name(class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err2, c) {
    if (err2 instanceof Error) {
      return this.errorHandler(err2, c);
    }
    throw err2;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err2) {
        return this.#handleError(err2, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err2) => this.#handleError(err2, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context2.res;
      } catch (err2) {
        return this.#handleError(err2, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
}, "_Hono");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }, "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = /* @__PURE__ */ __name(class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context2, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context2.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context2, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
}, "_Node");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = /* @__PURE__ */ __name(class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
}, "Trie");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = /* @__PURE__ */ __name(class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
}, "RegExpRouter");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = /* @__PURE__ */ __name(class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
}, "SmartRouter");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = /* @__PURE__ */ __name(class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
}, "_Node");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = /* @__PURE__ */ __name(class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
}, "TrieRouter");

// ../node_modules/.pnpm/hono@4.12.9/node_modules/hono/dist/hono.js
var Hono2 = /* @__PURE__ */ __name(class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
}, "Hono");

// ../shared/parse-url.js
function parseGithubUrl(url) {
  if (!url || typeof url !== "string")
    return null;
  let normalized = url.trim();
  if (normalized.startsWith("//"))
    normalized = "https:" + normalized;
  if (!normalized.startsWith("http"))
    normalized = "https://" + normalized;
  let u;
  try {
    u = new URL(normalized);
  } catch {
    return null;
  }
  if (u.hostname !== "github.com" && u.hostname !== "gitfold.cc")
    return null;
  const treeMatch = u.pathname.match(/^\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/);
  const repoMatch = !treeMatch && u.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
  const match2 = treeMatch || repoMatch;
  if (!match2)
    return null;
  const owner = match2[1];
  const repo = match2[2];
  if (!owner || !repo)
    return null;
  if (owner === "login" || owner === "settings" || owner === "explore")
    return null;
  if (treeMatch) {
    const branch = treeMatch[3];
    const rawPath = treeMatch[4] || "";
    const path = rawPath.replace(/\/+$/, "");
    return {
      provider: "github",
      type: path ? "folder" : "repo",
      owner,
      repo,
      branch,
      path,
      originalUrl: url
    };
  }
  return {
    provider: "github",
    type: "repo",
    owner,
    repo,
    branch: "",
    path: "",
    originalUrl: url
  };
}
__name(parseGithubUrl, "parseGithubUrl");

// src/services/subscription.js
async function getFileLimit(req, env2) {
  const subToken = req.headers.get("X-Sub-Token");
  if (subToken) {
    const record = await getSubByToken(env2.GITFOLD_SUBS, subToken);
    if (record && isActive(record)) {
      const limit = tierLimit(record.tier, env2);
      return { tier: record.tier, limit };
    }
  }
  const hasGithubToken = !!req.headers.get("X-GitHub-Token");
  if (hasGithubToken) {
    return { tier: "free", limit: parseInt(env2.TOKEN_FILE_LIMIT ?? "200", 10) };
  }
  return { tier: "free", limit: parseInt(env2.FREE_FILE_LIMIT ?? "50", 10) };
}
__name(getFileLimit, "getFileLimit");
async function getSubByEmail(kv, email) {
  const hash = await hashEmail(email);
  return kv.get(`sub:email:${hash}`, "json");
}
__name(getSubByEmail, "getSubByEmail");
async function getSubByToken(kv, token) {
  return kv.get(`sub:token:${token}`, "json");
}
__name(getSubByToken, "getSubByToken");
async function saveSub(kv, token, record) {
  const hash = await hashEmail(record.email);
  const json = JSON.stringify(record);
  await Promise.all([
    kv.put(`sub:token:${token}`, json),
    kv.put(`sub:email:${hash}`, json)
  ]);
}
__name(saveSub, "saveSub");
async function deleteSub(kv, token, email) {
  const hash = await hashEmail(email);
  await Promise.all([
    kv.delete(`sub:token:${token}`),
    kv.delete(`sub:email:${hash}`)
  ]);
}
__name(deleteSub, "deleteSub");
function isActive(record) {
  if (record.expiresAt && record.expiresAt < Date.now())
    return false;
  return true;
}
__name(isActive, "isActive");
function tierLimit(tier, env2) {
  if (tier === "pro")
    return parseInt(env2.PRO_FILE_LIMIT ?? "1000", 10);
  if (tier === "power")
    return parseInt(env2.POWER_FILE_LIMIT ?? "5000", 10);
  return parseInt(env2.FREE_FILE_LIMIT ?? "50", 10);
}
__name(tierLimit, "tierLimit");
async function hashEmail(email) {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashEmail, "hashEmail");
function generateSubToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "sub_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateSubToken, "generateSubToken");

// src/middleware/security.js
var LIMITS = {
  /** Hard ceiling regardless of tier */
  maxFiles: 5e3,
  /** Maximum total uncompressed size in bytes (100 MB) */
  maxBytes: 100 * 1024 * 1024,
  /** Maximum single file size in bytes (50 MB) */
  maxFileSizeBytes: 50 * 1024 * 1024
};
function errorResponse(status, code, message, hint) {
  return Response.json({ code, message, ...hint ? { hint } : {} }, { status });
}
__name(errorResponse, "errorResponse");
async function validateUrl(c, next) {
  if (c.req.method === "POST")
    return next();
  const rawUrl = c.req.query("url");
  if (!rawUrl) {
    return errorResponse(400, "INVALID_URL", "Missing required query parameter: url", "Provide a GitHub tree URL, e.g. ?url=https://github.com/owner/repo/tree/main/path");
  }
  let decoded;
  try {
    decoded = decodeURIComponent(rawUrl);
  } catch {
    return errorResponse(400, "INVALID_URL", "url parameter is not valid URI-encoded text");
  }
  const info3 = parseGithubUrl(decoded);
  if (!info3) {
    return errorResponse(400, "INVALID_URL", "Not a valid GitHub directory URL.", "URL must be in format: https://github.com/owner/repo/tree/branch/path");
  }
  c.set("repoInfo", info3);
  return next();
}
__name(validateUrl, "validateUrl");
async function resolveTier(c, next) {
  const sessionUser = c.get("sessionUser");
  if (sessionUser && sessionUser.tier !== "free") {
    const limit2 = tierToLimit(sessionUser.tier, c.env);
    c.set("tier", sessionUser.tier);
    c.set("fileLimit", limit2);
    return next();
  }
  const { tier, limit } = await getFileLimit(c.req.raw, c.env);
  if (tier === "free" && sessionUser) {
    c.set("tier", "free");
    c.set("fileLimit", parseInt(c.env.TOKEN_FILE_LIMIT ?? "200", 10));
    return next();
  }
  c.set("tier", tier);
  c.set("fileLimit", limit);
  return next();
}
__name(resolveTier, "resolveTier");
function tierToLimit(tier, env2) {
  switch (tier) {
    case "power":
      return parseInt(env2.POWER_FILE_LIMIT ?? "5000", 10);
    case "pro":
      return parseInt(env2.PRO_FILE_LIMIT ?? "1000", 10);
    default:
      return parseInt(env2.FREE_FILE_LIMIT ?? "50", 10);
  }
}
__name(tierToLimit, "tierToLimit");
function checkLimits(fileCount, totalBytes, tierFileLimit) {
  const effectiveLimit = tierFileLimit ?? LIMITS.maxFiles;
  if (fileCount > effectiveLimit) {
    return {
      ok: false,
      response: errorResponse(413, "TOO_MANY_FILES", `Directory contains ${fileCount} files (limit: ${effectiveLimit}).`, effectiveLimit < LIMITS.maxFiles ? "Upgrade your plan for higher limits, or try a smaller subdirectory." : "Try a smaller subdirectory, or use git sparse-checkout for large repos.")
    };
  }
  if (totalBytes > LIMITS.maxBytes) {
    const mb = (totalBytes / 1024 / 1024).toFixed(0);
    return {
      ok: false,
      response: errorResponse(413, "TOO_LARGE", `Directory is ~${mb} MB (limit: 100 MB).`, "Try a smaller subdirectory, or use git sparse-checkout for large repos.")
    };
  }
  return { ok: true };
}
__name(checkLimits, "checkLimits");
var ALLOWED_ORIGINS = [
  "https://gitfold.cc",
  "https://www.gitfold.cc"
];
function isAllowedOrigin(origin) {
  if (!origin)
    return null;
  if (ALLOWED_ORIGINS.includes(origin))
    return origin;
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin))
    return origin;
  return null;
}
__name(isAllowedOrigin, "isAllowedOrigin");
function corsHeaders(requestOrigin) {
  const allowed = isAllowedOrigin(requestOrigin);
  if (allowed) {
    return {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-GitHub-Token, X-Sub-Token",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400"
    };
  }
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-GitHub-Token, X-Sub-Token",
    "Access-Control-Max-Age": "86400"
  };
}
__name(corsHeaders, "corsHeaders");

// src/services/jwt.js
var ALGO = { name: "HMAC", hash: "SHA-256" };
var SESSION_TTL = 7 * 24 * 60 * 60;
async function signJwt(payload, secret) {
  const now = Math.floor(Date.now() / 1e3);
  const full = {
    ...payload,
    iat: payload.iat ?? now,
    exp: payload.exp ?? now + SESSION_TTL,
    jti: payload.jti ?? generateJti(),
    avatarUrl: payload.avatarUrl
  };
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(full));
  const signingInput = `${header}.${body}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(ALGO, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${arrayToBase64url(new Uint8Array(sig))}`;
}
__name(signJwt, "signJwt");
async function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3)
    return null;
  const header = parts[0];
  const body = parts[1];
  const sig = parts[2];
  const signingInput = `${header}.${body}`;
  const key = await importKey(secret);
  const sigBytes = base64urlToArray(sig);
  const valid = await crypto.subtle.verify(ALGO, key, sigBytes, new TextEncoder().encode(signingInput));
  if (!valid)
    return null;
  try {
    const payload = JSON.parse(base64urlDecode(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3))
      return null;
    return payload;
  } catch {
    return null;
  }
}
__name(verifyJwt, "verifyJwt");
function sessionCookie(jwt, domain2) {
  const parts = [
    `gitfold_session=${jwt}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL}`,
    "Path=/"
  ];
  if (domain2)
    parts.push(`Domain=${domain2}`);
  return parts.join("; ");
}
__name(sessionCookie, "sessionCookie");
function clearSessionCookie(domain2) {
  const parts = [
    "gitfold_session=",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
    "Path=/"
  ];
  if (domain2)
    parts.push(`Domain=${domain2}`);
  return parts.join("; ");
}
__name(clearSessionCookie, "clearSessionCookie");
function getSessionFromCookie(cookieHeader) {
  if (!cookieHeader)
    return null;
  const match2 = cookieHeader.match(/(?:^|;\s*)gitfold_session=([^;]+)/);
  return match2?.[1] ?? null;
}
__name(getSessionFromCookie, "getSessionFromCookie");
async function importKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), ALGO, false, ["sign", "verify"]);
}
__name(importKey, "importKey");
function generateJti() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateJti, "generateJti");
function base64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64url, "base64url");
function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - str.length % 4) % 4);
  return atob(padded);
}
__name(base64urlDecode, "base64urlDecode");
function arrayToBase64url(arr) {
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(arrayToBase64url, "arrayToBase64url");
function base64urlToArray(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - str.length % 4) % 4);
  const binary = atob(padded);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}
__name(base64urlToArray, "base64urlToArray");

// src/middleware/session.js
async function sessionMiddleware(c, next) {
  const secret = c.env.JWT_SECRET;
  if (!secret)
    return next();
  const cookieHeader = c.req.header("Cookie");
  const token = getSessionFromCookie(cookieHeader ?? null);
  if (!token)
    return next();
  const payload = await verifyJwt(token, secret);
  if (!payload)
    return next();
  if (payload.jti) {
    const revoked = await c.env.GITFOLD_CACHE.get(`session:revoked:${payload.jti}`);
    if (revoked)
      return next();
  }
  c.set("sessionUser", {
    userId: payload.sub,
    email: payload.email,
    githubLogin: payload.githubLogin,
    tier: payload.tier
  });
  return next();
}
__name(sessionMiddleware, "sessionMiddleware");

// src/services/github.js
var GITHUB_API = "https://api.github.com";
var RAW_BASE = "https://raw.githubusercontent.com";
var CACHE_TTL = 5 * 60;
function apiHeaders(token) {
  const h = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GitFold/1.0 (https://gitfold.cc)"
  };
  if (token)
    h.Authorization = `Bearer ${token}`;
  return h;
}
__name(apiHeaders, "apiHeaders");
async function checkGitHubResponse(res, context2 = "") {
  if (res.ok)
    return;
  const remaining = res.headers.get("X-RateLimit-Remaining");
  const resetTs = res.headers.get("X-RateLimit-Reset");
  if ((res.status === 403 || res.status === 429) && remaining === "0") {
    const resetDate = resetTs ? new Date(Number(resetTs) * 1e3).toUTCString() : "soon";
    throw errorResponse(429, "RATE_LIMITED", `GitHub API rate limit exceeded. Resets at ${resetDate}.`, "Provide X-GitHub-Token header to get 5,000 requests/hour.");
  }
  if (res.status === 401) {
    throw errorResponse(401, "UNAUTHORIZED", "GitHub token is invalid or expired.", "Check your X-GitHub-Token header.");
  }
  if (res.status === 404) {
    throw errorResponse(404, "NOT_FOUND", `Not found${context2 ? ": " + context2 : ""}.`, "Check that the repository, branch, and path exist.");
  }
  let msg = "";
  try {
    msg = (await res.json()).message ?? "";
  } catch {
  }
  throw errorResponse(502, "GITHUB_ERROR", `GitHub API error ${res.status}${msg ? ": " + msg : ""}`);
}
__name(checkGitHubResponse, "checkGitHubResponse");
async function fetchTree(info3, token, kv) {
  const cacheKey = `tree:${info3.owner}/${info3.repo}/${info3.branch}/${info3.path}`;
  const cached = await kv.get(cacheKey, "json");
  if (cached)
    return cached;
  const headers = apiHeaders(token);
  const branchRes = await fetch(`${GITHUB_API}/repos/${info3.owner}/${info3.repo}/branches/${encodeURIComponent(info3.branch)}`, { headers });
  await checkGitHubResponse(branchRes, `${info3.owner}/${info3.repo}@${info3.branch}`);
  const branchData = await branchRes.json();
  const treeSha = branchData.commit.commit.tree.sha;
  const treeRes = await fetch(`${GITHUB_API}/repos/${info3.owner}/${info3.repo}/git/trees/${treeSha}?recursive=1`, { headers });
  await checkGitHubResponse(treeRes);
  const treeData = await treeRes.json();
  if (treeData.truncated) {
    console.warn("[GitFold] GitHub truncated the tree (>100k files). Some files may be missing.");
  }
  const prefix = info3.path ? info3.path + "/" : "";
  const entries = treeData.tree.filter((e) => e.type === "blob" && !e.path.startsWith(".git/") && e.path !== ".git" && (info3.path === "" || e.path.startsWith(prefix))).map((e) => ({ path: e.path, type: "blob", size: e.size ?? 0, sha: e.sha }));
  if (entries.length === 0) {
    throw errorResponse(404, "NOT_FOUND", `No files found in '${info3.path || "/"}'. Check that the path exists.`, "Check that the directory exists and contains files.");
  }
  await kv.put(cacheKey, JSON.stringify(entries), { expirationTtl: CACHE_TTL });
  return entries;
}
__name(fetchTree, "fetchTree");
function getRawUrl(filePath, info3) {
  return `${RAW_BASE}/${info3.owner}/${info3.repo}/${info3.branch}/${filePath}`;
}
__name(getRawUrl, "getRawUrl");
async function fetchAllFiles(entries, info3) {
  const BATCH = 8;
  const results = new Array(entries.length);
  async function fetchOne(entry, idx) {
    const url = getRawUrl(entry.path, info3);
    const res = await fetch(url);
    if (!res.ok) {
      throw errorResponse(502, "GITHUB_ERROR", `Failed to fetch ${entry.path}: HTTP ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    results[idx] = { path: entry.path, data: new Uint8Array(buf) };
  }
  __name(fetchOne, "fetchOne");
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    await Promise.all(batch.map((e, j) => fetchOne(e, i + j)));
  }
  return results;
}
__name(fetchAllFiles, "fetchAllFiles");
function buildInfo(entries, info3) {
  return {
    provider: info3.provider,
    owner: info3.owner,
    repo: info3.repo,
    branch: info3.branch,
    path: info3.path,
    fileCount: entries.length,
    totalSize: entries.reduce((s, e) => s + (e.size ?? 0), 0),
    files: entries.map((e) => ({ path: e.path, size: e.size ?? 0 }))
  };
}
__name(buildInfo, "buildInfo");

// ../node_modules/.pnpm/fflate@0.8.2/node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = /* @__PURE__ */ __name(function(eb, start) {
  var b = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j = b[i]; j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
}, "freb");
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = /* @__PURE__ */ __name(function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v = le[cd[i] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
}, "hMap");
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var shft = /* @__PURE__ */ __name(function(p) {
  return (p + 7) / 8 | 0;
}, "shft");
var slc = /* @__PURE__ */ __name(function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
}, "slc");
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = /* @__PURE__ */ __name(function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
}, "err");
var wbits = /* @__PURE__ */ __name(function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
}, "wbits");
var wbits16 = /* @__PURE__ */ __name(function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
}, "wbits16");
var hTree = /* @__PURE__ */ __name(function(d, mb) {
  var t = [];
  for (var i = 0; i < d.length; ++i) {
    if (d[i])
      t.push({ s: i, f: d[i] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i = 1; i < s; ++i) {
    if (t2[i].s > maxSym)
      maxSym = t2[i].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i < s; ++i) {
      var i2_1 = t2[i].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i;
    }
    for (; i >= 0 && dt; --i) {
      var i2_3 = t2[i].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
}, "hTree");
var ln = /* @__PURE__ */ __name(function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
}, "ln");
var lc = /* @__PURE__ */ __name(function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = /* @__PURE__ */ __name(function(v) {
    cl[cli++] = v;
  }, "w");
  for (var i = 1; i <= s; ++i) {
    if (c[i] == cln && i != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
}, "lc");
var clen = /* @__PURE__ */ __name(function(cf, cl) {
  var l = 0;
  for (var i = 0; i < cl.length; ++i)
    l += cf[i] * cl[i];
  return l;
}, "clen");
var wfblk = /* @__PURE__ */ __name(function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i = 0; i < s; ++i)
    out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
}, "wfblk");
var wblk = /* @__PURE__ */ __name(function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i = 0; i < lclt.length; ++i)
    ++lcfreq[lclt[i] & 31];
  for (var i = 0; i < lcdt.length; ++i)
    ++lcfreq[lcdt[i] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i = 0; i < nlcc; ++i)
      wbits(out, p + 3 * i, lct[clim[i]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i = 0; i < clct.length; ++i) {
        var len = clct[i] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i = 0; i < li; ++i) {
    var sym = syms[i];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
}, "wblk");
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = /* @__PURE__ */ __name(function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = /* @__PURE__ */ __name(function(i2) {
      return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
    }, "hsh");
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i + 2 < s; ++i) {
      var hv = hsh(i);
      var imod = i & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i) {
        var rem = s - i;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = lc_1 = eb = 0, bs = i;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i + l] == dat[i + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i, st.w = wi;
    }
  } else {
    for (var i = st.w || 0; i < s + lst; i += 65535) {
      var e = i + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
}, "dflt");
var crct = /* @__PURE__ */ function() {
  var t = new Int32Array(256);
  for (var i = 0; i < 256; ++i) {
    var c = i, k = 9;
    while (--k)
      c = (c & 1 && -306674912) ^ c >>> 1;
    t[i] = c;
  }
  return t;
}();
var crc = /* @__PURE__ */ __name(function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i = 0; i < d.length; ++i)
        cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
}, "crc");
var dopt = /* @__PURE__ */ __name(function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
}, "dopt");
var mrg = /* @__PURE__ */ __name(function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
}, "mrg");
var wbytes = /* @__PURE__ */ __name(function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
}, "wbytes");
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
__name(deflateSync, "deflateSync");
var fltn = /* @__PURE__ */ __name(function(d, p, t, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val))
      op = mrg(o, val[1]), val = val[0];
    if (val instanceof u8)
      t[n] = [val, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val, n, t, o);
    }
  }
}, "fltn");
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i = 0; i < str.length; ++i)
      ar_1[i] = str.charCodeAt(i);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = /* @__PURE__ */ __name(function(v) {
    ar[ai++] = v;
  }, "w");
  for (var i = 0; i < l; ++i) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
__name(strToU8, "strToU8");
var exfl = /* @__PURE__ */ __name(function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
}, "exfl");
var wzh = /* @__PURE__ */ __name(function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
}, "wzh");
var wzf = /* @__PURE__ */ __name(function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
}, "wzf");
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file, p) : file, l = d.length;
    var c = crc();
    c.p(file);
    files.push(mrg(p, {
      size: file.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i = 0; i < files.length; ++i) {
    var f = files[i];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
__name(zipSync, "zipSync");

// src/services/zip.js
function createZip(files, rootPath) {
  const prefix = rootPath ? rootPath + "/" : "";
  const fileMap = {};
  for (const { path, data } of files) {
    const zipPath = prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path;
    if (!zipPath)
      continue;
    fileMap[zipPath] = data;
  }
  return zipSync(fileMap, { level: 6 });
}
__name(createZip, "createZip");
function zipResponse(zipData, filename, extraHeaders = {}) {
  const safeName = filename.endsWith(".zip") ? filename : filename + ".zip";
  return new Response(zipData, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(zipData.byteLength),
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}
__name(zipResponse, "zipResponse");
function zipFilename(path, repoName) {
  const base = path ? path.split("/").pop() ?? repoName : repoName;
  return `${base} -gitfold.cc`;
}
__name(zipFilename, "zipFilename");

// src/services/tar.js
var enc = new TextEncoder();
function buildTarHeader(name, size) {
  const header = new Uint8Array(512);
  function writeStr(offset, maxLen, value) {
    const bytes = enc.encode(value);
    header.set(bytes.subarray(0, Math.min(bytes.length, maxLen)), offset);
  }
  __name(writeStr, "writeStr");
  function writeOctal(offset, len, value) {
    writeStr(offset, len, value.toString(8).padStart(len - 1, "0") + "\0");
  }
  __name(writeOctal, "writeOctal");
  let prefix = "";
  let shortName = name;
  if (name.length > 100) {
    const splitAt = name.slice(0, 155).lastIndexOf("/");
    if (splitAt > 0) {
      prefix = name.slice(0, splitAt);
      shortName = name.slice(splitAt + 1);
    }
    if (shortName.length > 100)
      shortName = shortName.slice(shortName.length - 100);
  }
  writeStr(0, 100, shortName);
  writeOctal(100, 8, 420);
  writeOctal(108, 8, 0);
  writeOctal(116, 8, 0);
  writeOctal(124, 12, size);
  writeOctal(136, 12, Math.floor(Date.now() / 1e3));
  header.fill(32, 148, 156);
  header[156] = 48;
  writeStr(257, 6, "ustar\0");
  writeStr(263, 2, "00");
  writeStr(345, 155, prefix);
  let sum = 0;
  for (const b of header)
    sum += b;
  writeStr(148, 8, sum.toString(8).padStart(6, "0") + "\0 ");
  return header;
}
__name(buildTarHeader, "buildTarHeader");
function tarGzResponse(files, rootPath, filename, extraHeaders = {}) {
  const prefix = rootPath ? rootPath + "/" : "";
  const EMPTY_512 = new Uint8Array(512);
  const { readable, writable } = new TransformStream();
  const compressed = readable.pipeThrough(new CompressionStream("gzip"));
  const writer = writable.getWriter();
  (async () => {
    try {
      for (const { path, data } of files) {
        const entryPath = prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path;
        if (!entryPath)
          continue;
        const header = buildTarHeader(entryPath, data.byteLength);
        await writer.write(header);
        await writer.write(data);
        const remainder = data.byteLength % 512;
        if (remainder > 0) {
          await writer.write(new Uint8Array(512 - remainder));
        }
      }
      await writer.write(EMPTY_512);
      await writer.write(EMPTY_512);
      await writer.close();
    } catch (err2) {
      await writer.abort(err2);
    }
  })();
  const safeName = filename.endsWith(".tar.gz") ? filename : filename + ".tar.gz";
  return new Response(compressed, {
    status: 200,
    headers: {
      "Content-Type": "application/x-tar",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}
__name(tarGzResponse, "tarGzResponse");

// src/services/cache.js
function zipCacheKey(info3, commitSha) {
  return `zip/${info3.owner}/${info3.repo}/${encodeURIComponent(info3.path || "_root")}/${commitSha}.zip`;
}
__name(zipCacheKey, "zipCacheKey");
async function getZipFromR2(env2, key) {
  if (!env2.R2_CACHE)
    return null;
  try {
    const obj = await env2.R2_CACHE.get(key);
    return obj;
  } catch (err2) {
    console.warn("[cache] R2 get error:", err2);
    return null;
  }
}
__name(getZipFromR2, "getZipFromR2");
async function saveZipToR2(env2, key, data) {
  if (!env2.R2_CACHE)
    return;
  try {
    await env2.R2_CACHE.put(key, data, {
      httpMetadata: {
        contentType: "application/zip"
      },
      customMetadata: {
        createdAt: String(Date.now())
      }
    });
  } catch (err2) {
    console.warn("[cache] R2 put error:", err2);
  }
}
__name(saveZipToR2, "saveZipToR2");
var GITHUB_API2 = "https://api.github.com";
async function fetchCommitSha(info3, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GitFold/1.0 (https://gitfold.cc)"
  };
  if (token)
    headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${GITHUB_API2}/repos/${info3.owner}/${info3.repo}/commits/${encodeURIComponent(info3.branch)}`, { headers });
    if (!res.ok)
      return null;
    const data = await res.json();
    return data.sha ?? null;
  } catch {
    return null;
  }
}
__name(fetchCommitSha, "fetchCommitSha");
async function cleanupOldZips(env2, maxAgeDays = 30) {
  if (!env2.R2_CACHE)
    return { deleted: 0 };
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1e3;
  let deleted = 0;
  let cursor;
  do {
    const listed = await env2.R2_CACHE.list({
      prefix: "zip/",
      limit: 500,
      cursor
    });
    const toDelete = [];
    for (const obj of listed.objects) {
      const createdAt = obj.customMetadata?.createdAt;
      if (createdAt && parseInt(createdAt, 10) < cutoff) {
        toDelete.push(obj.key);
      } else if (!createdAt && obj.uploaded.getTime() < cutoff) {
        toDelete.push(obj.key);
      }
    }
    if (toDelete.length > 0) {
      await env2.R2_CACHE.delete(toDelete);
      deleted += toDelete.length;
    }
    cursor = listed.truncated ? listed.cursor : void 0;
  } while (cursor);
  console.log(`[cache] Cleaned up ${deleted} expired ZIP files`);
  return { deleted };
}
__name(cleanupOldZips, "cleanupOldZips");

// src/services/analytics.js
function trackDownload(env2, event) {
  if (!env2.ANALYTICS)
    return;
  try {
    env2.ANALYTICS.writeDataPoint({
      // String dimensions (up to 20 blobs)
      blobs: [
        event.userId,
        // blob1: user ID
        event.tier,
        // blob2: tier
        event.owner,
        // blob3: repo owner
        event.repo,
        // blob4: repo name
        event.path,
        // blob5: directory path
        event.cacheHit ? "1" : "0",
        // blob6: cache hit flag
        event.source
        // blob7: client source
      ],
      // Numeric metrics (up to 20 doubles)
      doubles: [
        event.fileCount,
        // double1: file count
        event.totalBytes,
        // double2: total bytes
        event.durationMs
        // double3: duration in ms
      ],
      // Index for per-user queries
      indexes: [event.userId]
    });
  } catch (err2) {
    console.warn("[analytics] writeDataPoint error:", err2);
  }
}
__name(trackDownload, "trackDownload");

// src/services/crypto.js
var ALGO2 = "AES-GCM";
var KEY_LENGTH = 256;
var IV_LENGTH = 12;
async function deriveKey(secret) {
  const rawBytes = hexToBytes(secret);
  return crypto.subtle.importKey("raw", rawBytes, { name: ALGO2, length: KEY_LENGTH }, false, ["encrypt", "decrypt"]);
}
__name(deriveKey, "deriveKey");
async function encryptToken(token, secret) {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = new TextEncoder().encode(token);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO2, iv }, key, plaintext);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bytesToBase64(combined);
}
__name(encryptToken, "encryptToken");
async function decryptToken(encrypted, secret) {
  const key = await deriveKey(secret);
  const combined = base64ToBytes(encrypted);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt({ name: ALGO2, iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
__name(decryptToken, "decryptToken");
function hexToBytes(hex) {
  const clean = hex.replace(/^0x/, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
__name(hexToBytes, "hexToBytes");
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
__name(bytesToBase64, "bytesToBase64");
function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(base64ToBytes, "base64ToBytes");

// src/services/auth.js
var GITHUB_AUTH = "https://github.com/login/oauth";
var GITHUB_API3 = "https://api.github.com";
function buildAuthUrl(env2, state, redirectUri) {
  const params = new URLSearchParams({
    client_id: env2.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "repo,user:email",
    state
  });
  return `${GITHUB_AUTH}/authorize?${params}`;
}
__name(buildAuthUrl, "buildAuthUrl");
async function exchangeCode(code, env2, redirectUri) {
  const res = await fetch(`${GITHUB_AUTH}/access_token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: env2.GITHUB_CLIENT_ID,
      client_secret: env2.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    })
  });
  if (!res.ok) {
    throw new Error(`GitHub OAuth exchange failed: ${res.status}`);
  }
  const data = await res.json();
  if (data.error || !data.access_token) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error || "no token"}`);
  }
  return data.access_token;
}
__name(exchangeCode, "exchangeCode");
async function fetchGitHubUser(accessToken) {
  const res = await fetch(`${GITHUB_API3}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "GitFold/1.0 (https://gitfold.cc)"
    }
  });
  if (!res.ok) {
    throw new Error(`GitHub user fetch failed: ${res.status}`);
  }
  const user = await res.json();
  if (!user.email) {
    try {
      const emailRes = await fetch(`${GITHUB_API3}/user/emails`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "GitFold/1.0 (https://gitfold.cc)"
        }
      });
      if (emailRes.ok) {
        const emails = await emailRes.json();
        const primary = emails.find((e) => e.primary && e.verified);
        if (primary)
          user.email = primary.email;
      }
    } catch {
    }
  }
  return user;
}
__name(fetchGitHubUser, "fetchGitHubUser");
async function findOrCreateUser(db, githubUser) {
  const now = Date.now();
  const existing = await db.prepare("SELECT id, email, github_id, github_login, avatar_url FROM users WHERE github_id = ?").bind(githubUser.id).first();
  if (existing) {
    await db.prepare("UPDATE users SET github_login = ?, avatar_url = ?, email = COALESCE(?, email), updated_at = ? WHERE id = ?").bind(githubUser.login, githubUser.avatar_url, githubUser.email, now, existing.id).run();
    return {
      ...existing,
      github_login: githubUser.login,
      avatar_url: githubUser.avatar_url,
      email: githubUser.email ?? existing.email
    };
  }
  const userId = crypto.randomUUID();
  const email = githubUser.email || `${githubUser.id}+${githubUser.login}@users.noreply.github.com`;
  await db.prepare("INSERT INTO users (id, email, github_id, github_login, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(userId, email, githubUser.id, githubUser.login, githubUser.avatar_url, now, now).run();
  return { id: userId, email, github_id: githubUser.id, github_login: githubUser.login, avatar_url: githubUser.avatar_url };
}
__name(findOrCreateUser, "findOrCreateUser");
async function storeOAuthToken(db, userId, accessToken, encryptionKey) {
  const now = Date.now();
  const encrypted = await encryptToken(accessToken, encryptionKey);
  await db.batch([
    db.prepare("DELETE FROM github_tokens WHERE user_id = ? AND token_type = ?").bind(userId, "oauth"),
    db.prepare("INSERT INTO github_tokens (id, user_id, encrypted_token, scope, token_type, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, encrypted, "repo,user:email", "oauth", now, now)
  ]);
}
__name(storeOAuthToken, "storeOAuthToken");
async function getUserOAuthToken(db, userId, encryptionKey) {
  const row = await db.prepare("SELECT id, encrypted_token FROM github_tokens WHERE user_id = ? AND token_type = ? LIMIT 1").bind(userId, "oauth").first();
  if (!row)
    return null;
  db.prepare("UPDATE github_tokens SET last_used_at = ? WHERE id = ?").bind(Date.now(), row.id).run().catch(() => {
  });
  try {
    return await decryptToken(row.encrypted_token, encryptionKey);
  } catch {
    console.warn("[auth] Failed to decrypt OAuth token for user", userId);
    return null;
  }
}
__name(getUserOAuthToken, "getUserOAuthToken");
async function getUserTier(db, userId) {
  const row = await db.prepare(`SELECT tier FROM subscriptions
     WHERE user_id = ? AND status IN ('active', 'trialing')
     ORDER BY created_at DESC LIMIT 1`).bind(userId).first();
  return row?.tier ?? "free";
}
__name(getUserTier, "getUserTier");
async function createOAuthState(kv) {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const state = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  await kv.put(`oauth:state:${state}`, "1", { expirationTtl: 600 });
  return state;
}
__name(createOAuthState, "createOAuthState");
async function validateOAuthState(kv, state) {
  const val = await kv.get(`oauth:state:${state}`);
  if (!val)
    return false;
  await kv.delete(`oauth:state:${state}`);
  return true;
}
__name(validateOAuthState, "validateOAuthState");

// src/routes/api.js
var api = new Hono2();
api.get("/download", async (c) => {
  const info3 = c.get("repoInfo");
  const sessionUser = c.get("sessionUser");
  let token = c.req.header("X-GitHub-Token");
  if (!token && sessionUser && c.env.TOKEN_ENCRYPTION_KEY) {
    token = await getUserOAuthToken(c.env.DB, sessionUser.userId, c.env.TOKEN_ENCRYPTION_KEY) ?? void 0;
  }
  token = token ?? c.env.GITHUB_TOKEN;
  const fmt = c.req.query("format");
  const useTarGz = fmt === "tar.gz" || fmt === "tgz";
  if (info3.type === "repo") {
    const ext = useTarGz ? "tar.gz" : "zip";
    const archiveUrl = `https://github.com/${info3.owner}/${info3.repo}/archive/refs/heads/${info3.branch}.${ext}`;
    return c.redirect(archiveUrl, 302);
  }
  const startTime = Date.now();
  const userId = sessionUser?.userId ?? "anon";
  const rawClient = c.req.header("X-Client") ?? "web";
  const source = rawClient === "extension" || rawClient === "cli" ? rawClient : "web";
  try {
    let commitSha = null;
    if (!useTarGz) {
      commitSha = await fetchCommitSha(info3, token);
    }
    const tree = await fetchTree(info3, token, c.env.GITFOLD_CACHE);
    const totalSize = tree.reduce((s, e) => s + (e.size ?? 0), 0);
    const limitCheck = checkLimits(tree.length, totalSize, c.get("fileLimit"));
    if (!limitCheck.ok)
      return limitCheck.response;
    if (commitSha) {
      const cacheKey = zipCacheKey(info3, commitSha);
      const cached = await getZipFromR2(c.env, cacheKey);
      if (cached) {
        const name2 = zipFilename(info3.path, info3.repo);
        const safeName = name2.endsWith(".zip") ? name2 : name2 + ".zip";
        trackDownload(c.env, {
          userId,
          tier: c.get("tier") ?? "free",
          source,
          owner: info3.owner,
          repo: info3.repo,
          path: info3.path,
          fileCount: tree.length,
          totalBytes: cached.size,
          durationMs: Date.now() - startTime,
          cacheHit: true
        });
        return new Response(cached.body, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${safeName}"`,
            "Content-Length": String(cached.size),
            "Cache-Control": "no-store",
            "X-Cache": "HIT",
            ...corsHeaders()
          }
        });
      }
    }
    const files = await fetchAllFiles(tree, info3);
    const name = zipFilename(info3.path, info3.repo);
    if (useTarGz) {
      return tarGzResponse(files, info3.path, name, corsHeaders());
    }
    const zipData = createZip(files, info3.path);
    if (commitSha) {
      const cacheKey = zipCacheKey(info3, commitSha);
      c.executionCtx.waitUntil(saveZipToR2(c.env, cacheKey, zipData));
    }
    trackDownload(c.env, {
      userId,
      tier: c.get("tier") ?? "free",
      source,
      owner: info3.owner,
      repo: info3.repo,
      path: info3.path,
      fileCount: tree.length,
      totalBytes: zipData.byteLength,
      durationMs: Date.now() - startTime,
      cacheHit: false
    });
    return zipResponse(zipData, name, corsHeaders());
  } catch (err2) {
    if (err2 instanceof Response)
      return err2;
    console.error("[gitfold] Unexpected error in /download:", err2);
    return Response.json({ code: "INTERNAL_ERROR", message: "An unexpected error occurred." }, { status: 500, headers: corsHeaders() });
  }
});
api.get("/info", async (c) => {
  const info3 = c.get("repoInfo");
  const sessionUser = c.get("sessionUser");
  let token = c.req.header("X-GitHub-Token");
  if (!token && sessionUser && c.env.TOKEN_ENCRYPTION_KEY) {
    token = await getUserOAuthToken(c.env.DB, sessionUser.userId, c.env.TOKEN_ENCRYPTION_KEY) ?? void 0;
  }
  token = token ?? c.env.GITHUB_TOKEN;
  try {
    const tree = await fetchTree(info3, token, c.env.GITFOLD_CACHE);
    const result = buildInfo(tree, info3);
    return Response.json({ ...result, tier: c.get("tier") ?? "free", fileLimit: c.get("fileLimit") ?? 50 }, { headers: corsHeaders() });
  } catch (err2) {
    if (err2 instanceof Response) {
      const body = await err2.json();
      return Response.json(body, { status: err2.status, headers: corsHeaders() });
    }
    console.error("[gitfold] Unexpected error in /info:", err2);
    return Response.json({ code: "INTERNAL_ERROR", message: "An unexpected error occurred." }, { status: 500, headers: corsHeaders() });
  }
});
api.get("/download/progress", async (c) => {
  const info3 = c.get("repoInfo");
  const sessionUser = c.get("sessionUser");
  let token = c.req.header("X-GitHub-Token");
  if (!token && sessionUser && c.env.TOKEN_ENCRYPTION_KEY) {
    token = await getUserOAuthToken(c.env.DB, sessionUser.userId, c.env.TOKEN_ENCRYPTION_KEY) ?? void 0;
  }
  token = token ?? c.env.GITHUB_TOKEN;
  if (info3.type === "repo") {
    return Response.json({ code: "UNSUPPORTED", message: "SSE progress is only available for subdirectory downloads." }, { status: 400, headers: corsHeaders(c.req.header("Origin")) });
  }
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  function send2(data) {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}

`));
  }
  __name(send2, "send");
  c.executionCtx.waitUntil((async () => {
    try {
      const tree = await fetchTree(info3, token, c.env.GITFOLD_CACHE);
      const totalSize = tree.reduce((s, e) => s + (e.size ?? 0), 0);
      send2({ type: "tree", count: tree.length, size: totalSize, limit: c.get("fileLimit") ?? 50 });
      const limitCheck = checkLimits(tree.length, totalSize, c.get("fileLimit"));
      if (!limitCheck.ok) {
        const body = await limitCheck.response.clone().json();
        send2({ type: "error", code: body.code, message: body.message });
        writer.close();
        return;
      }
      const total = tree.length;
      let done = 0;
      const files = new Array(total);
      const BATCH = 8;
      for (let i = 0; i < total; i += BATCH) {
        const batch = tree.slice(i, i + BATCH);
        await Promise.all(batch.map(async (entry, j) => {
          const url = `https://raw.githubusercontent.com/${info3.owner}/${info3.repo}/${info3.branch}/${entry.path}`;
          const res = await fetch(url);
          if (!res.ok)
            throw new Error(`Failed to fetch ${entry.path}: HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          files[i + j] = { path: entry.path, data: new Uint8Array(buf) };
          done++;
          send2({ type: "progress", done, total, path: entry.path });
        }));
      }
      send2({ type: "zipping" });
      const zipData = createZip(files, info3.path);
      const filename = zipFilename(info3.path, info3.repo);
      if (zipData.byteLength <= 24 * 1024 * 1024) {
        const jobId = crypto.randomUUID();
        await c.env.GITFOLD_CACHE.put(`job:${jobId}`, zipData, { expirationTtl: 300 });
        await c.env.GITFOLD_CACHE.put(`job:${jobId}:name`, filename, { expirationTtl: 300 });
        send2({ type: "done", jobId, filename });
      } else {
        send2({ type: "too_large", message: "Zip too large for streaming; use direct download." });
      }
    } catch (err2) {
      const msg = err2 instanceof Error ? err2.message : "Unknown error";
      send2({ type: "error", code: "INTERNAL_ERROR", message: msg });
    } finally {
      writer.close();
    }
  })());
  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      ...corsHeaders(c.req.header("Origin"))
    }
  });
});
api.post("/download", async (c) => {
  const sessionUser = c.get("sessionUser");
  let token = c.req.header("X-GitHub-Token");
  if (!token && sessionUser && c.env.TOKEN_ENCRYPTION_KEY) {
    token = await getUserOAuthToken(c.env.DB, sessionUser.userId, c.env.TOKEN_ENCRYPTION_KEY) ?? void 0;
  }
  token = token ?? c.env.GITHUB_TOKEN;
  let body;
  try {
    body = await c.req.json();
  } catch {
    return Response.json({ code: "INVALID_URL", message: "Invalid JSON body" }, { status: 400 });
  }
  const { owner, repo, branch, paths } = body;
  if (!owner || !repo || !branch || !Array.isArray(paths) || paths.length === 0 || paths.length > 10) {
    return Response.json({ code: "INVALID_URL", message: "Missing required fields or too many paths (max 10)" }, { status: 400 });
  }
  const startTime = Date.now();
  const userId = sessionUser?.userId ?? "anon";
  const fileLimit = c.get("fileLimit");
  const rawClient = c.req.header("X-Client") ?? "web";
  const source = rawClient === "extension" || rawClient === "cli" ? rawClient : "web";
  try {
    const allTrees = [];
    let totalEntries = 0;
    let totalTreeSize = 0;
    for (const path of paths) {
      const pathInfo = {
        provider: "github",
        type: "folder",
        owner,
        repo,
        branch,
        path,
        originalUrl: ""
      };
      const tree = await fetchTree(pathInfo, token, c.env.GITFOLD_CACHE);
      totalEntries += tree.length;
      totalTreeSize += tree.reduce((s, e) => s + (e.size ?? 0), 0);
      allTrees.push(tree);
    }
    const limitCheck = checkLimits(totalEntries, totalTreeSize, fileLimit);
    if (!limitCheck.ok)
      return limitCheck.response;
    const allFiles = [];
    for (let i = 0; i < paths.length; i++) {
      const currentPath = paths[i];
      const currentTree = allTrees[i];
      const pathInfo = {
        provider: "github",
        type: "folder",
        owner,
        repo,
        branch,
        path: currentPath,
        originalUrl: ""
      };
      const files = await fetchAllFiles(currentTree, pathInfo);
      allFiles.push(...files);
    }
    const zipData = createZip(allFiles, "");
    const filename = zipFilename("selection", repo);
    trackDownload(c.env, {
      userId,
      tier: c.get("tier") ?? "free",
      source,
      owner,
      repo,
      path: paths.join(","),
      fileCount: allFiles.length,
      totalBytes: allFiles.reduce((s, f) => s + f.data.byteLength, 0),
      durationMs: Date.now() - startTime,
      cacheHit: false
    });
    return zipResponse(zipData, filename, corsHeaders(c.req.header("Origin")));
  } catch (err2) {
    if (err2 instanceof Response)
      return err2;
    console.error("[POST /download]", err2);
    return Response.json({ code: "GITHUB_ERROR", message: "Unexpected error" }, { status: 500 });
  }
});
var api_default = api;

// src/services/stripe.js
var STRIPE_API = "https://api.stripe.com/v1";
async function createCheckoutSession(params, env2) {
  const priceId = params.tier === "pro" ? env2.STRIPE_PRO_PRICE_ID : env2.STRIPE_POWER_PRICE_ID;
  if (!priceId || !env2.STRIPE_SECRET_KEY) {
    throw new Error("Stripe not configured");
  }
  const body = new URLSearchParams({
    "mode": "subscription",
    "customer_email": params.email,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "success_url": params.successUrl,
    "cancel_url": params.cancelUrl,
    "metadata[tier]": params.tier
  });
  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env2.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if (!res.ok) {
    const err2 = await res.text();
    console.error("[stripe] checkout error:", err2);
    throw new Error("Failed to create checkout session");
  }
  const session = await res.json();
  return session.url;
}
__name(createCheckoutSession, "createCheckoutSession");
async function verifyWebhook(payload, signature, secret) {
  if (!signature)
    return null;
  const parts = Object.fromEntries(signature.split(",").map((p) => {
    const [k, v] = p.split("=");
    return [k, v];
  }));
  const timestamp = parts["t"];
  const sig = parts["v1"];
  if (!timestamp || !sig)
    return null;
  const age = Math.abs(Date.now() / 1e3 - parseInt(timestamp, 10));
  if (age > 300)
    return null;
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(expected)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (!timingSafeEqual(sig, expectedHex))
    return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
__name(verifyWebhook, "verifyWebhook");
async function processWebhookEvent(event, env2) {
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const sessionId = obj["id"];
      const email = obj["customer_email"];
      const customerId = obj["customer"];
      const subId = obj["subscription"];
      const tier = obj["metadata"]?.["tier"] ?? "pro";
      const token = generateSubToken();
      const record = {
        tier,
        email,
        stripeCustomerId: customerId,
        stripeSubId: subId
      };
      await saveSub(env2.GITFOLD_SUBS, token, record);
      const claimData = JSON.stringify({ token, email });
      await Promise.all([
        env2.GITFOLD_SUBS.put(`checkout:${subId}`, claimData, { expirationTtl: 3600 }),
        env2.GITFOLD_SUBS.put(`session:${sessionId}`, claimData, { expirationTtl: 3600 })
      ]);
      break;
    }
    case "customer.subscription.updated": {
      const email = await getCustomerEmail(obj["customer"], env2);
      if (!email)
        break;
      const status = obj["status"];
      if (status === "active" || status === "trialing") {
        const existing = await findSubByStripeId(obj["id"], env2);
        if (existing) {
          existing.record.expiresAt = void 0;
          await saveSub(env2.GITFOLD_SUBS, existing.token, existing.record);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subId = obj["id"];
      const existing = await findSubByStripeId(subId, env2);
      if (existing) {
        await deleteSub(env2.GITFOLD_SUBS, existing.token, existing.record.email);
      }
      break;
    }
  }
}
__name(processWebhookEvent, "processWebhookEvent");
async function getCustomerEmail(customerId, env2) {
  if (!env2.STRIPE_SECRET_KEY)
    return null;
  const res = await fetch(`${STRIPE_API}/customers/${customerId}`, {
    headers: { "Authorization": `Bearer ${env2.STRIPE_SECRET_KEY}` }
  });
  if (!res.ok)
    return null;
  const customer = await res.json();
  return customer.email ?? null;
}
__name(getCustomerEmail, "getCustomerEmail");
async function findSubByStripeId(stripeSubId, env2) {
  const mapping = await env2.GITFOLD_SUBS.get(`checkout:${stripeSubId}`, "json");
  if (!mapping)
    return null;
  const record = await env2.GITFOLD_SUBS.get(`sub:token:${mapping.token}`, "json");
  if (!record)
    return null;
  return { token: mapping.token, record };
}
__name(findSubByStripeId, "findSubByStripeId");
function timingSafeEqual(a, b) {
  if (a.length !== b.length)
    return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
__name(timingSafeEqual, "timingSafeEqual");

// src/routes/billing.js
var billing = new Hono2();
billing.post("/checkout", async (c) => {
  let email;
  let rawTier;
  try {
    const body = await c.req.json();
    email = body.email?.trim().toLowerCase();
    rawTier = body.tier;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid JSON body.");
  }
  if (!email) {
    return errorResponse(400, "INVALID_REQUEST", "Email is required.");
  }
  const tier = rawTier === "power" ? "power" : "pro";
  try {
    const origin = new URL(c.req.url).origin;
    const url = await createCheckoutSession({
      email,
      tier,
      successUrl: `https://gitfold.cc/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `https://gitfold.cc/pricing?checkout=cancelled`
    }, c.env);
    return Response.json({ url }, { headers: corsHeaders() });
  } catch (err2) {
    console.error("[billing] checkout error:", err2);
    return errorResponse(500, "CHECKOUT_ERROR", "Failed to create checkout session.");
  }
});
billing.post("/webhook/stripe", async (c) => {
  const secret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return errorResponse(500, "CONFIG_ERROR", "Webhook secret not configured.");
  }
  const payload = await c.req.text();
  const signature = c.req.header("Stripe-Signature");
  const event = await verifyWebhook(payload, signature ?? null, secret);
  if (!event) {
    return errorResponse(400, "INVALID_SIGNATURE", "Webhook signature verification failed.");
  }
  try {
    await processWebhookEvent(event, c.env);
    return Response.json({ received: true });
  } catch (err2) {
    console.error("[billing] webhook processing error:", err2);
    return errorResponse(500, "WEBHOOK_ERROR", "Failed to process webhook event.");
  }
});
billing.get("/sub/claim", async (c) => {
  const sessionId = c.req.query("session_id");
  if (!sessionId) {
    return errorResponse(400, "INVALID_REQUEST", "Missing session_id parameter.");
  }
  const mapping = await c.env.GITFOLD_SUBS.get(`session:${sessionId}`, "json");
  if (!mapping) {
    return Response.json({ ok: false, message: "Session not found or expired. It may take a moment \u2014 please refresh." }, { headers: corsHeaders() });
  }
  return Response.json({ ok: true, token: mapping.token, email: mapping.email }, { headers: corsHeaders() });
});
billing.get("/sub/status", async (c) => {
  const email = c.req.query("email");
  const token = c.req.query("token");
  if (!email && !token) {
    return errorResponse(400, "INVALID_REQUEST", "Provide email or token query parameter.");
  }
  const record = token ? await getSubByToken(c.env.GITFOLD_SUBS, token) : await getSubByEmail(c.env.GITFOLD_SUBS, email);
  if (!record) {
    return Response.json({ tier: "free", active: false }, { headers: corsHeaders() });
  }
  const active = !record.expiresAt || record.expiresAt > Date.now();
  return Response.json({
    tier: active ? record.tier : "free",
    active,
    email: record.email
  }, { headers: corsHeaders() });
});
var billing_default = billing;

// src/routes/auth.js
var auth = new Hono2();
var FRONTEND_ORIGIN = "https://gitfold.cc";
auth.get("/auth/github", async (c) => {
  if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET || !c.env.JWT_SECRET) {
    return errorResponse(500, "CONFIG_ERROR", "GitHub OAuth not configured.");
  }
  const state = await createOAuthState(c.env.GITFOLD_CACHE);
  const redirectUri = new URL("/v1/auth/github/callback", c.req.url).toString();
  const authUrl = buildAuthUrl(c.env, state, redirectUri);
  return c.redirect(authUrl, 302);
});
auth.get("/auth/github/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error3 = c.req.query("error");
  if (error3) {
    return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=denied`, 302);
  }
  if (!code || !state) {
    return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=missing_params`, 302);
  }
  if (!c.env.JWT_SECRET) {
    return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=server_error`, 302);
  }
  const stateValid = await validateOAuthState(c.env.GITFOLD_CACHE, state);
  if (!stateValid) {
    return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=invalid_state`, 302);
  }
  try {
    const redirectUri = new URL("/v1/auth/github/callback", c.req.url).toString();
    const accessToken = await exchangeCode(code, c.env, redirectUri);
    const githubUser = await fetchGitHubUser(accessToken);
    const dbUser = await findOrCreateUser(c.env.DB, githubUser);
    if (c.env.TOKEN_ENCRYPTION_KEY) {
      await storeOAuthToken(c.env.DB, dbUser.id, accessToken, c.env.TOKEN_ENCRYPTION_KEY);
    }
    const tier = await getUserTier(c.env.DB, dbUser.id);
    const jwt = await signJwt({
      sub: dbUser.id,
      email: dbUser.email,
      githubLogin: dbUser.github_login,
      avatarUrl: dbUser.avatar_url ?? void 0,
      tier
    }, c.env.JWT_SECRET);
    const cookie = sessionCookie(jwt, "gitfold.cc");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${FRONTEND_ORIGIN}/?auth=success`,
        "Set-Cookie": cookie
      }
    });
  } catch (err2) {
    console.error("[auth] OAuth callback error:", err2);
    return c.redirect(`${FRONTEND_ORIGIN}/?auth=error&reason=server_error`, 302);
  }
});
auth.post("/auth/logout", async (c) => {
  const cookieHeader = c.req.header("Cookie");
  const token = getSessionFromCookie(cookieHeader ?? null);
  if (token && c.env.JWT_SECRET) {
    const payload = await verifyJwt(token, c.env.JWT_SECRET);
    if (payload?.jti) {
      const remainingTtl = Math.max(0, payload.exp - Math.floor(Date.now() / 1e3));
      if (remainingTtl > 0) {
        await c.env.GITFOLD_CACHE.put(`session:revoked:${payload.jti}`, "1", { expirationTtl: remainingTtl });
      }
    }
  }
  const cookie = clearSessionCookie("gitfold.cc");
  return Response.json({ ok: true }, {
    headers: {
      "Set-Cookie": cookie,
      ...corsHeaders(c.req.header("Origin"))
    }
  });
});
auth.get("/auth/me", async (c) => {
  const sessionUser = c.get("sessionUser");
  if (!sessionUser) {
    return Response.json({ authenticated: false }, { headers: corsHeaders(c.req.header("Origin")) });
  }
  return Response.json({
    authenticated: true,
    userId: sessionUser.userId,
    email: sessionUser.email,
    githubLogin: sessionUser.githubLogin,
    tier: sessionUser.tier
  }, { headers: corsHeaders(c.req.header("Origin")) });
});
var auth_default = auth;

// src/routes/team.js
var team = new Hono2();
function requireSession(sessionUser) {
  if (!sessionUser) {
    return errorResponse(401, "UNAUTHORIZED", "You must be signed in to manage teams.");
  }
  return null;
}
__name(requireSession, "requireSession");
function requirePower(sessionUser) {
  const authErr = requireSession(sessionUser);
  if (authErr)
    return authErr;
  if (sessionUser.tier !== "power") {
    return errorResponse(403, "FORBIDDEN", "Team features require a Power subscription.");
  }
  return null;
}
__name(requirePower, "requirePower");
async function getUserTeam(db, userId) {
  const owned = await db.prepare("SELECT * FROM teams WHERE owner_id = ? LIMIT 1").bind(userId).first();
  if (owned)
    return { ...owned, role: "owner" };
  const membership = await db.prepare(`
      SELECT t.*, tm.role FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = ? AND tm.status = 'active'
      LIMIT 1
    `).bind(userId).first();
  return membership ?? null;
}
__name(getUserTeam, "getUserTeam");
team.post("/team/create", async (c) => {
  const sessionUser = c.get("sessionUser");
  const err2 = requirePower(sessionUser);
  if (err2)
    return err2;
  let name;
  try {
    const body = await c.req.json();
    name = body.name?.trim();
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid JSON body.");
  }
  if (!name || name.length < 2 || name.length > 64) {
    return errorResponse(400, "INVALID_REQUEST", "Team name must be 2\u201364 characters.");
  }
  const existing = await getUserTeam(c.env.DB, sessionUser.userId);
  if (existing) {
    return errorResponse(409, "ALREADY_IN_TEAM", "You are already in a team.");
  }
  const teamId = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare("INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)").bind(teamId, name, sessionUser.userId, now).run();
  return Response.json({ ok: true, team: { id: teamId, name, ownerId: sessionUser.userId, createdAt: now } }, { headers: corsHeaders(c.req.header("Origin")) });
});
team.post("/team/invite", async (c) => {
  const sessionUser = c.get("sessionUser");
  const err2 = requirePower(sessionUser);
  if (err2)
    return err2;
  let email;
  try {
    const body = await c.req.json();
    email = body.email?.trim().toLowerCase();
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid JSON body.");
  }
  if (!email || !email.includes("@")) {
    return errorResponse(400, "INVALID_REQUEST", "Valid email is required.");
  }
  const userTeam = await c.env.DB.prepare("SELECT id FROM teams WHERE owner_id = ? LIMIT 1").bind(sessionUser.userId).first();
  if (!userTeam) {
    return errorResponse(404, "NO_TEAM", "Create a team first.");
  }
  const existing = await c.env.DB.prepare("SELECT id, status FROM team_members WHERE team_id = ? AND email = ? LIMIT 1").bind(userTeam.id, email).first();
  if (existing?.status === "active") {
    return errorResponse(409, "ALREADY_MEMBER", "This person is already a member.");
  }
  const inviteToken = crypto.randomUUID();
  const now = Date.now();
  if (existing) {
    await c.env.DB.prepare("UPDATE team_members SET invite_token = ?, status = 'invited', created_at = ? WHERE id = ?").bind(inviteToken, now, existing.id).run();
  } else {
    await c.env.DB.prepare("INSERT INTO team_members (id, team_id, email, role, status, invite_token, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userTeam.id, email, "member", "invited", inviteToken, now).run();
  }
  const inviteUrl = `https://gitfold.cc/team?join=${inviteToken}`;
  return Response.json({ ok: true, inviteUrl, inviteToken, email }, { headers: corsHeaders(c.req.header("Origin")) });
});
team.get("/team/members", async (c) => {
  const sessionUser = c.get("sessionUser");
  const err2 = requireSession(sessionUser);
  if (err2)
    return err2;
  const userTeam = await getUserTeam(c.env.DB, sessionUser.userId);
  if (!userTeam) {
    return Response.json({ members: [], team: null }, { headers: corsHeaders(c.req.header("Origin")) });
  }
  const members = await c.env.DB.prepare(`
      SELECT tm.id, tm.email, tm.role, tm.status, tm.joined_at, tm.created_at,
             u.github_login, u.avatar_url
      FROM team_members tm
      LEFT JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ? AND tm.status != 'removed'
      ORDER BY tm.created_at ASC
    `).bind(userTeam.id).all();
  return Response.json({
    team: { id: userTeam.id, name: userTeam.name, ownerId: userTeam.owner_id },
    members: members.results
  }, { headers: corsHeaders(c.req.header("Origin")) });
});
team.delete("/team/member/:memberId", async (c) => {
  const sessionUser = c.get("sessionUser");
  const err2 = requireSession(sessionUser);
  if (err2)
    return err2;
  const memberId = c.req.param("memberId");
  const ownerTeam = await c.env.DB.prepare("SELECT id FROM teams WHERE owner_id = ? LIMIT 1").bind(sessionUser.userId).first();
  if (!ownerTeam) {
    return errorResponse(403, "FORBIDDEN", "Only the team owner can remove members.");
  }
  const member = await c.env.DB.prepare("SELECT id FROM team_members WHERE id = ? AND team_id = ?").bind(memberId, ownerTeam.id).first();
  if (!member) {
    return errorResponse(404, "NOT_FOUND", "Member not found in your team.");
  }
  await c.env.DB.prepare("UPDATE team_members SET status = 'removed' WHERE id = ?").bind(memberId).run();
  return Response.json({ ok: true }, { headers: corsHeaders(c.req.header("Origin")) });
});
team.post("/team/join", async (c) => {
  const sessionUser = c.get("sessionUser");
  const err2 = requireSession(sessionUser);
  if (err2)
    return err2;
  let inviteToken;
  try {
    const body = await c.req.json();
    inviteToken = body.token?.trim();
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid JSON body.");
  }
  if (!inviteToken) {
    return errorResponse(400, "INVALID_REQUEST", "Invite token is required.");
  }
  const invite = await c.env.DB.prepare("SELECT * FROM team_members WHERE invite_token = ? AND status = 'invited' LIMIT 1").bind(inviteToken).first();
  if (!invite) {
    return errorResponse(404, "INVALID_TOKEN", "Invite token not found or already used.");
  }
  const now = Date.now();
  await c.env.DB.prepare("UPDATE team_members SET user_id = ?, status = 'active', joined_at = ?, invite_token = NULL WHERE id = ?").bind(sessionUser.userId, now, invite.id).run();
  const teamInfo = await c.env.DB.prepare("SELECT id, name, owner_id FROM teams WHERE id = ? LIMIT 1").bind(invite.team_id).first();
  return Response.json({ ok: true, team: teamInfo }, { headers: corsHeaders(c.req.header("Origin")) });
});
team.get("/team/info", async (c) => {
  const sessionUser = c.get("sessionUser");
  const err2 = requireSession(sessionUser);
  if (err2)
    return err2;
  const userTeam = await getUserTeam(c.env.DB, sessionUser.userId);
  return Response.json({ team: userTeam ?? null }, { headers: corsHeaders(c.req.header("Origin")) });
});
var team_default = team;

// src/index.ts
var app = new Hono2();
app.use("*", sessionMiddleware);
app.options("*", (c) => {
  return new Response(null, { status: 204, headers: corsHeaders(c.req.header("Origin")) });
});
app.get(
  "/health",
  (c) => Response.json({
    ok: true,
    service: "worker",
    version: "1.0.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  })
);
app.get(
  "/docs",
  (c) => c.redirect("https://gitfold.cc/docs", 302)
);
app.route("/api/v1", auth_default);
app.route("/v1", auth_default);
app.route("/api/v1", billing_default);
app.route("/v1", billing_default);
app.route("/api/v1", team_default);
app.route("/v1", team_default);
async function downloadResultHandler(c) {
  const jobId = c.req.query("jobId");
  if (!jobId) {
    return Response.json(
      { code: "MISSING_PARAM", message: "Missing jobId query parameter." },
      { status: 400, headers: corsHeaders(c.req.header("Origin")) }
    );
  }
  const [zipData, filename] = await Promise.all([
    c.env.GITFOLD_CACHE.get(`job:${jobId}`, "arrayBuffer"),
    c.env.GITFOLD_CACHE.get(`job:${jobId}:name`, "text")
  ]);
  if (!zipData) {
    return Response.json(
      { code: "JOB_EXPIRED", message: "Job not found or expired (5-minute window)." },
      { status: 404, headers: corsHeaders(c.req.header("Origin")) }
    );
  }
  c.executionCtx.waitUntil(Promise.all([
    c.env.GITFOLD_CACHE.delete(`job:${jobId}`),
    c.env.GITFOLD_CACHE.delete(`job:${jobId}:name`)
  ]));
  const safeName = filename ? filename.endsWith(".zip") ? filename : filename + ".zip" : "download.zip";
  return new Response(zipData, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(zipData.byteLength),
      "Cache-Control": "no-store",
      ...corsHeaders(c.req.header("Origin"))
    }
  });
}
__name(downloadResultHandler, "downloadResultHandler");
app.get("/v1/download/result", downloadResultHandler);
app.get("/api/v1/download/result", downloadResultHandler);
var v1 = new Hono2();
v1.use("*", validateUrl);
v1.use("*", resolveTier);
v1.route("/", api_default);
app.route("/api/v1", v1);
app.route("/v1", v1);
app.notFound(
  (c) => Response.json(
    {
      code: "NOT_FOUND",
      message: `Route not found: ${c.req.method} ${new URL(c.req.url).pathname}`,
      hint: "See https://gitfold.cc/docs for available endpoints."
    },
    { status: 404, headers: corsHeaders() }
  )
);
var src_default = {
  fetch: app.fetch,
  async scheduled(event, env2, ctx) {
    ctx.waitUntil(cleanupOldZips(env2, 30));
  }
};
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
