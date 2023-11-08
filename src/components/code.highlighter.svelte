<script lang="ts">
  import { onMount } from 'svelte';
  import {
    EditorView,
    lineNumbers,
    highlightActiveLine,
  } from '@codemirror/view'
  import { EditorState } from '@codemirror/state';

  import { tags } from "@lezer/highlight";
  import {
    syntaxHighlighting,
    defaultHighlightStyle,
    HighlightStyle
  } from '@codemirror/language';
  import { javascript } from '@codemirror/lang-javascript';

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
      "min-height": "0",
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
  })


  onMount(() => {
    let editorView = new EditorView({
      parent: editorContainerElement,
      state: EditorState.create({
        doc: JSON.parse(localStorage.getItem('editor')) ?? '',
        extensions: [
          draculaTheme,
          EditorView.lineWrapping,
          lineNumbers(),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          jsHighlightExtension,
          javascript({
            typescript: true
          })
        ],
      })
    });
  });
</script>

<div bind:this={editorContainerElement}></div>

