<script lang="ts" context="module">
  import esbuild from 'esbuild-wasm';
  import esbuildWasmUrl from 'esbuild-wasm/esbuild.wasm?url';
  import type { Plugin, BuildContext as EsbuildContext } from 'esbuild-wasm';
  import type { Diagnostic, LintSource } from '@codemirror/lint';
  import type { TsServer } from './ts.server.ts';

  await esbuild.initialize({
    wasmURL: esbuildWasmUrl
  });

  // Virtual file-system for esbuild
  // Since we don't have a file-system while compiling in browser context
  function createVfsPlugin(tsEnv: TsServer): Plugin {
    return {
      name: 'vfs-esbuild',
      setup(build) {

        build.onResolve({ filter: /\.ts$/ }, (args) => {
          const { path, importer, resolveDir } = args;
          return { path: ["/", path].join("") }
        });

        build.onLoad({ filter: /\.ts$/ }, async (args) => {
          const { path } = args;
          const tokens = path.split("/");
          const fileName = tokens.pop();
          const sourceFile = await tsEnv.getSourceFile(fileName);

          if (fileName) {
            return {
              contents: sourceFile?.text,
              loader: 'ts'
            }
          }

          return {
            contents: '',
            loader: 'ts'
          }
        })
      }
    };
  }

  function createTsServerLinter(tsEnv: TsServer): LintSource {
    return async (view) => {
      const diagnostics: Diagnostic[] = await tsEnv.getSemanticDiagnostics('/editor.ts') as Diagnostic[];

      return diagnostics;
    }
  }
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorState } from '@codemirror/state';
  import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view'
  import { defaultKeymap, historyKeymap, indentWithTab, history } from '@codemirror/commands';
  import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, HighlightStyle } from '@codemirror/language';
  import { javascript } from '@codemirror/lang-javascript';
  import { linter, lintGutter } from '@codemirror/lint';
  import { tags } from '@lezer/highlight';
  import { initTsServer } from './ts.server.ts';

  export let typesMap: Map<any, any>  = new Map();

  let editorContainerElement: HTMLElement;
  let editorView;

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
    { tag: tags.propertyName, color: "rgba(135, 108, 158, 1)" },
    { tag: tags.function(tags.definition(tags.variableName)), color: '#FFC66D' },
    { tag: tags.function(tags.propertyName), color: "#FFC66D" },
    { tag: tags.function(tags.variableName), color: "#FFC66D" },
  ]);
  const jsHighlightExtension = syntaxHighlighting(jsHighlightStyles);
  const draculaTheme = [
    EditorView.baseTheme({

    }),
    EditorView.theme({
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
      ".cm-tooltip-lint, .cm-tooltip": {
        background: "rgb(68, 68, 68)",
        "border-color": "rgb(68, 68, 68)",
        color: "rgb(183, 183, 183)",
        "border-radius": "4px",
        "& .cm-diagnostic-error": {
          "padding": "0.5rem 1rem",
          "border-left-width": "2px"
        }
      }
    })
  ];

  const DEFAULT_STORAGE_VALUE = "\r\n\r\n\r\n\r\n\r\n";
  let esbuildCtx: EsbuildContext;
  let tsServerEnv: TsServer;

  async function initTsEnv() {
    const tsServerEnv = await initTsServer(typesMap);
    await Promise.all([
      tsServerEnv.createFile('editor.ts', JSON.parse(localStorage.getItem('editor') ?? JSON.stringify(DEFAULT_STORAGE_VALUE))),
      tsServerEnv.createFile('/editor.ts', JSON.parse(localStorage.getItem('editor') ?? JSON.stringify(DEFAULT_STORAGE_VALUE))),
      tsServerEnv.createFile('another.ts', 'export const test: number = 1; '),
      tsServerEnv.createFile('/another.ts', 'export const test: number = 1; '),
    ])

    const esbuildCtx = await esbuild.context({
      entryPoints: ['editor.ts'],
      bundle: true,
      outfile: 'test.js',
      plugins: [createVfsPlugin(tsServerEnv)],
    });

      return {
        tsServerEnv,
        esbuildCtx
      };
  }

  const runHandler = async (event: Event) => {
    const buildResult = await esbuildCtx.rebuild();
    const contents = buildResult.outputFiles;
    const js = contents?.pop()?.text ?? '';
    eval(js);
  }

  onMount(async () => {
    const env = await initTsEnv();
    tsServerEnv = env.tsServerEnv;
    esbuildCtx = env.esbuildCtx;
    editorView = new EditorView({
      parent: editorContainerElement,
      state: EditorState.create({
        doc: JSON.parse(localStorage.getItem('editor')  ?? JSON.stringify(DEFAULT_STORAGE_VALUE)),
        extensions: [
          ...draculaTheme,
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
          linter(createTsServerLinter(tsServerEnv)),
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
              tsServerEnv.updateFile('editor.ts', json);
              tsServerEnv.updateFile('/editor.ts', json);
            }
          })
        ],
      })
    });
  });
  onDestroy(async () => {
    tsServerEnv.terminate();
  })
</script>

<button class="fixed top-0 right-0 z-10"
        on:click={runHandler}
>
  RUN
</button>
<div class="h-screen" bind:this={editorContainerElement}></div>

