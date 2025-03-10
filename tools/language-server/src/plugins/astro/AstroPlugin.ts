import { DefinitionLink } from 'vscode-languageserver';
import type { Document, DocumentManager } from '../../core/documents';
import type { ConfigManager } from '../../core/config';
import type { CompletionsProvider, AppCompletionList, FoldingRangeProvider } from '../interfaces';
import {
  CompletionContext,
  Position,
  CompletionList,
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  LocationLink,
  FoldingRange,
  Range,
  TextEdit,
} from 'vscode-languageserver';
import { Node } from 'vscode-html-languageservice';
import { isPossibleClientComponent, pathToUrl, urlToPath } from '../../utils';
import { isInsideFrontmatter } from '../../core/documents/utils';
import * as ts from 'typescript';
import { LanguageServiceManager as TypeScriptLanguageServiceManager } from '../typescript/LanguageServiceManager';
import { ensureRealFilePath } from '../typescript/utils';
import { FoldingRangeKind } from 'vscode-languageserver-types';

export class AstroPlugin implements CompletionsProvider, FoldingRangeProvider {
  private readonly docManager: DocumentManager;
  private readonly configManager: ConfigManager;
  private readonly tsLanguageServiceManager: TypeScriptLanguageServiceManager;

  constructor(docManager: DocumentManager, configManager: ConfigManager, workspaceUris: string[]) {
    this.docManager = docManager;
    this.configManager = configManager;
    this.tsLanguageServiceManager = new TypeScriptLanguageServiceManager(docManager, configManager, workspaceUris);
  }

  async getCompletions(document: Document, position: Position, completionContext?: CompletionContext): Promise<AppCompletionList | null> {
    const doc = this.docManager.get(document.uri);
    if (!doc) return null;

    let items: CompletionItem[] = [];

    if (completionContext?.triggerCharacter === '-') {
      const frontmatter = this.getComponentScriptCompletion(doc, position, completionContext);
      if (frontmatter) items.push(frontmatter);
    }

    if (completionContext?.triggerCharacter === ':') {
      const clientHint = this.getClientHintCompletion(doc, position, completionContext);
      if (clientHint) items.push(...clientHint);
    }

    return CompletionList.create(items, true);
  }

  async getFoldingRanges(document: Document): Promise<FoldingRange[]> {
    const foldingRanges: FoldingRange[] = [];
    const { frontmatter } = document.astro;

    // Currently editing frontmatter, don't fold
    if (frontmatter.state !== 'closed') return foldingRanges;

    const start = document.positionAt(frontmatter.startOffset as number);
    const end = document.positionAt((frontmatter.endOffset as number) - 3);
    return [
      {
        startLine: start.line,
        startCharacter: start.character,
        endLine: end.line,
        endCharacter: end.character,
        kind: FoldingRangeKind.Imports,
      },
    ];
  }

  async getDefinitions(document: Document, position: Position): Promise<DefinitionLink[]> {
    if (this.isInsideFrontmatter(document, position)) {
      return [];
    }

    const offset = document.offsetAt(position);
    const html = document.html;

    const node = html.findNodeAt(offset);
    if (!this.isComponentTag(node)) {
      return [];
    }

    const [componentName] = node.tag!.split(':');

    const filePath = urlToPath(document.uri);
    const tsFilePath = filePath + '.ts';

    const { lang, tsDoc } = await this.tsLanguageServiceManager.getTypeScriptDoc(document);

    const sourceFile = lang.getProgram()?.getSourceFile(tsFilePath);
    if (!sourceFile) {
      return [];
    }

    const specifier = this.getImportSpecifierForIdentifier(sourceFile, componentName);
    if (!specifier) {
      return [];
    }

    const defs = lang.getDefinitionAtPosition(tsFilePath, specifier.getStart());
    if (!defs) {
      return [];
    }

    const tsFragment = await tsDoc.getFragment();
    const startRange: Range = Range.create(Position.create(0, 0), Position.create(0, 0));
    const links = defs.map((def) => {
      const defFilePath = ensureRealFilePath(def.fileName);
      return LocationLink.create(pathToUrl(defFilePath), startRange, startRange);
    });

    return links;
  }

  private getClientHintCompletion(document: Document, position: Position, completionContext?: CompletionContext): CompletionItem[] | null {
    const node = document.html.findNodeAt(document.offsetAt(position));
    if (!isPossibleClientComponent(node)) return null;

    return [
      {
        label: ':load',
        insertText: 'load',
        commitCharacters: ['l'],
      },
      {
        label: ':idle',
        insertText: 'idle',
        commitCharacters: ['i'],
      },
      {
        label: ':visible',
        insertText: 'visible',
        commitCharacters: ['v'],
      },
    ];
  }

  private getComponentScriptCompletion(document: Document, position: Position, completionContext?: CompletionContext): CompletionItem | null {
    const base = {
      kind: CompletionItemKind.Snippet,
      label: '---',
      sortText: '\0',
      preselect: true,
      detail: 'Component script',
      insertTextFormat: InsertTextFormat.Snippet,
      commitCharacters: ['-'],
    };
    const prefix = document.getLineUntilOffset(document.offsetAt(position));

    if (document.astro.frontmatter.state === null) {
      return {
        ...base,
        insertText: '---\n$0\n---',
        textEdit: prefix.match(/^\s*\-+/) ? TextEdit.replace({ start: { ...position, character: 0 }, end: position }, '---\n$0\n---') : undefined,
      };
    }
    if (document.astro.frontmatter.state === 'open') {
      return {
        ...base,
        insertText: '---',
        textEdit: prefix.match(/^\s*\-+/) ? TextEdit.replace({ start: { ...position, character: 0 }, end: position }, '---') : undefined,
      };
    }
    return null;
  }

  private isInsideFrontmatter(document: Document, position: Position) {
    return isInsideFrontmatter(document.getText(), document.offsetAt(position));
  }

  private isComponentTag(node: Node): boolean {
    if (!node.tag) {
      return false;
    }
    const firstChar = node.tag[0];
    return /[A-Z]/.test(firstChar);
  }

  private getImportSpecifierForIdentifier(sourceFile: ts.SourceFile, identifier: string): ts.Expression | undefined {
    let importSpecifier: ts.Expression | undefined = undefined;
    ts.forEachChild(sourceFile, (tsNode) => {
      if (ts.isImportDeclaration(tsNode)) {
        if (tsNode.importClause) {
          const { name } = tsNode.importClause;
          if (name && name.getText() === identifier) {
            importSpecifier = tsNode.moduleSpecifier;
            return true;
          }
        }
      }
    });
    return importSpecifier;
  }
}
