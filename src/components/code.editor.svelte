<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorState } from '@codemirror/state';
  import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view'
  import { defaultKeymap, historyKeymap, indentWithTab, history } from '@codemirror/commands';
  import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, HighlightStyle } from '@codemirror/language';
  import { javascript, esLint as jsLinter } from '@codemirror/lang-javascript';
  import { linter, lintGutter } from '@codemirror/lint';
  import { tags } from '@lezer/highlight';

  import ts from "typescript"
  import { createSystem, createVirtualTypeScriptEnvironment, createDefaultMapFromCDN, createVirtualCompilerHost } from '@typescript/vfs'

  let editorContainerElement: HTMLElement = null;

  const jsHighlightStyles = HighlightStyle.define([
    // TODO
    // { tag: tags.typeName, color: 'red' },
    //

    { tag: tags.comment, color: "#808080" },
    { tag: tags.keyword, color: '#CC7832' },

    { tag: tags.bool, color: '#CC7832' },
    { tag: tags.string, color: 'rgba(98, 118, 80, 1)' },
    { tag: tags.number, color: 'rgba(104, 139, 176, 1)' },


    { tag: tags.separator, color: '#CC7832' },
    { tag: tags.function, color: '#FFC66D' },
    { tag: tags.propertyName, color: "rgba(135, 108, 158, 1)" },
    { tag: tags.function(tags.propertyName), color: "#FFC66D" }
  ]);
  const jsHighlightExtension = syntaxHighlighting(jsHighlightStyles);

  const draculaTheme =  EditorView.theme({
    ".cm-scroller": {
      background: "rgba(38, 38, 38, 1)",
      "font-size": "var(--tm-editor-font-size, 14px)",
      "font-family": "var(--tm-editor-font-family)"
    },
    ".cm-content": {
      "min-height": "100vh",
      "caret-color": "rgba(160, 172, 187, 1)",
      color: "rgba(160, 172, 187, 1)",
      background: "rgba(38, 38, 38, 1)"
    },
    ".cm-activeLine": {
      background: "rgba(44, 44, 44, 1)"
    },
    ".cm-gutters": {
      "border-right-color": "rgba(44, 44, 44, 1)",
      background: "rgba(38, 38, 38, 1)"
    },
  });

  const DEFAULT_STORAGE_VALUE = "\r\n\r\n\r\n\r\n\r\n";
  const TS_COMPILER_OPTIONS = {
    target: ts.ScriptTarget.ES2015,
  };

  async function initTs() {
    const defaultFsMap = await createDefaultMapFromCDN(TS_COMPILER_OPTIONS, ts.version, false, ts);
    defaultFsMap.set('editor.ts', JSON.parse(localStorage.getItem('editor')  ?? JSON.stringify(DEFAULT_STORAGE_VALUE)));
    defaultFsMap.set('another.ts', 'export const test = 1; ');

    const system = createSystem(defaultFsMap);
    const tsEnv = createVirtualTypeScriptEnvironment(system, [], ts);
    const host = createVirtualCompilerHost(system, TS_COMPILER_OPTIONS, ts);
    // tsEnv.createFile('/editor.ts', JSON.parse(localStorage.getItem('editor')  ?? JSON.stringify(DEFAULT_STORAGE_VALUE)));
    // tsEnv.createFile('/another.ts', 'export const test = 1; ');

    // host.updateFile('/editor.ts', 'export const test = 1; ');
    // host.updateFile('/another.ts', 'export const test = 1; ');

    const program = ts.createProgram({
      rootNames: [...defaultFsMap.keys()],
      options: {
        sourceMap: true,
        target: ts.ScriptTarget.ES2015
      },
      host: host.compilerHost
    });
    program.emit();
    console.log(defaultFsMap.get('editor.js'));

    return tsEnv;
  }




  onMount(async () => {
    let tsEnv = await initTs();
    let editorView = new EditorView({
      parent: editorContainerElement,
      state: EditorState.create({
        doc: JSON.parse(localStorage.getItem('editor')  ?? JSON.stringify(DEFAULT_STORAGE_VALUE)),
        extensions: [
          draculaTheme,
          EditorView.lineWrapping,
          lineNumbers(),

          indentOnInput(),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          jsHighlightExtension,
          javascript({
            typescript: true
          }),

          history(),

          // Linting
          // linter(view => {
          //   const tsEnvSemanticDiagnostic = tsEnv.languageService.getSemanticDiagnostics('/editor.ts');
          //
          //   return tsEnvSemanticDiagnostic.map(item => ({
          //     severity: 'error',
          //     from: item.start,
          //     to: (item.start + item.length),
          //     message: (typeof item.messageText === 'string') ? item.messageText : item.messageText.messageText
          //   }));
          // }),
          lintGutter(),


          // Keymaps
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab
          ]),
          EditorView.updateListener.of((viewUpdate) => {
            if (viewUpdate.docChanged) {
              const doc = viewUpdate.state.toJSON().doc;
              const json = !!doc ? doc : DEFAULT_STORAGE_VALUE;
              localStorage.setItem('editor', JSON.stringify(json));
              // tsEnv.updateFile('/editor.ts', json);
            }

          })
        ],
      })
    });



  });
</script>

<div class="h-screen" bind:this={editorContainerElement}></div>

