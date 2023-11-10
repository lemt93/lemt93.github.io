import ts from 'typescript';
import { createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';
let tsEnv;

onmessage = (e) => {
  console.log('Received message', e.data);

  const [action, context] = e.data;


  if (action === 'init') {
    const system = createSystem(context.typesMap);
    tsEnv = createVirtualTypeScriptEnvironment(system, [], ts);
    postMessage([context.callId, 'ok', null]);
  }

  if (action === 'createFile') {
    const { callId, fileName, content } = context;
    try {
      tsEnv.createFile(fileName, content);
      postMessage([callId, 'ok', null]);
    } catch (e) {
      postMessage([callId, 'error', null, e]);
    }
  }

  if (action === 'updateFile') {
    const { callId, fileName, content } = context;
    try {
      tsEnv.updateFile(fileName, content);
      postMessage([callId, 'ok', null]);
    } catch (e) {
      postMessage([callId, 'error', null, e]);
    }
  }

  if (action === 'getSourceFile') {
    const { callId, fileName } = context;
    try {
      const sourceFile = tsEnv.getSourceFile(fileName);

      postMessage([callId, 'ok', {
        text: sourceFile?.text
      }]);
    } catch (e) {
      postMessage([callId, 'error', null, e]);
    }
  }

  if (action === 'languageService.getSemanticDiagnostics') {
    const { callId, fileName } = context;
    try {
      const semanticDiagnostics = tsEnv.languageService.getSemanticDiagnostics(fileName);
      // How to clone full object web worker?

      postMessage([callId, 'ok', semanticDiagnostics.map(item => ({
        severity: 'error',
        from: item.start ?? 0,
        to: (!!item.start && !!item.length) ? (item.start + item.length) : 0,
        message: (typeof item.messageText === 'string') ? item.messageText : item.messageText.messageText
      } ))]);
    } catch (e) {
      postMessage([callId, 'error', null, e]);
    }
  }
}
