export type TsServer = {
  createFile: (fileName: string, content: string) => Promise<unknown>;
  updateFile: (fileName: string, content: string, replaceTextSpan?: import('typescript').TextSpan) => Promise<unknown>;
  terminate: () => void;
  getSourceFile: (fileName: string) => Promise<import('typescript').SourceFile | undefined>;
  getSemanticDiagnostics: (fileName: string) => Promise<any>
}

type ResolveFn<T> = (value: T | PromiseLike<T>) => void;
type RejectFn = (reason?: any) => void;

let id = 1;
function uuid(): string {
  return (++id).toString();
}

export async function initTsServer(typesMap: Map<any, any>): Promise<TsServer> {
  const tsEnvWorker = new Worker(new URL('./worker.js', import.meta.url), {
    type: 'module'
  });
  const resolvers: Record<string, ResolveFn<any>> = {};
  const rejectors: Record<string, RejectFn> = {};

  tsEnvWorker.onmessage = (ev: MessageEvent) => {
    const data = ev.data;
    const [ callId, status, result, errors ] = data;

    if (status === 'ok') {
      resolvers[callId]?.call(resolvers, result);
    } else {
      rejectors[callId]?.call(rejectors, errors);
    }
  };

  async function createFile(fileName: string, content: string) {
    const callId = uuid();
    tsEnvWorker.postMessage(['createFile', { fileName, content, callId }]);
    return new Promise((resolve, reject) => {
      resolvers[callId] = resolve;
      rejectors[callId] = reject
    });
  }

  async function updateFile(fileName: string, content: string) {
    const callId = uuid();
    tsEnvWorker.postMessage(['updateFile', { fileName, content, callId }]);
    return new Promise((resolve, reject) => {
      resolvers[callId] = resolve;
      rejectors[callId] = reject
    });
  }

  async function getSourceFile(fileName: string): Promise<import('typescript').SourceFile | undefined> {
    const callId = uuid();
    tsEnvWorker.postMessage(['getSourceFile', { fileName, callId }]);
    return new Promise((resolve, reject) => {
      resolvers[callId] = resolve;
      rejectors[callId] = reject
    });
  }


  async function _init() {
    const callId = uuid();
    tsEnvWorker.postMessage(['init', { typesMap, callId }]);
    return new Promise((resolve, reject) => {
      resolvers[callId] = resolve;
      rejectors[callId] = reject
    });
  }

  async function getSemanticDiagnostics(fileName: string) {
    const callId = uuid();
    tsEnvWorker.postMessage(['languageService.getSemanticDiagnostics', { fileName, callId }]);
    return new Promise((resolve, reject) => {
      resolvers[callId] = resolve;
      rejectors[callId] = reject
    });
  }

  await _init();


  return Promise.resolve({
    getSourceFile,
    createFile,
    updateFile,
    getSemanticDiagnostics,
    terminate: () => tsEnvWorker.terminate()
  } satisfies TsServer);
}
